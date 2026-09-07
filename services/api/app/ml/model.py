"""
CC-MRSF-Net-lite: a compact TensorFlow/Keras realization of the blueprint's
Conservation-Constrained Multi-Resolution Spatiotemporal Fusion Network.

Simplifications vs. the full spec (documented honestly in docs/model-card.md):
  - Satellite encoder + coarse-emission encoder + fusion decoder are collapsed
    into one small U-Net (skip connections, 2 downsample/upsample stages)
    instead of separate CNN/MLP/attention-decoder branches.
  - No temporal transformer — variants stand in for time slices, but the
    model is trained without explicit sequence modeling.
  - Uncertainty comes from MC-Dropout ensembling rather than a dedicated
    quantile-regression head.

What is NOT simplified: the conservation layer. It is a real differentiable
TensorFlow layer applied inside the forward pass, so every prediction this
model produces already sums exactly to the coarse input by construction —
this is the one piece of the architecture the blueprint treats as
non-negotiable, and it is implemented as specified (a hard output
transformation, not a loss term).
"""

from __future__ import annotations

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

FACTOR = 8


class ConservationNormalize(layers.Layer):
    """Forces every `factor x factor` block of the input to sum to 1.0.

    This is the hard conservation constraint from Sec. 5: predicted raw
    positive weights are rescaled so their coarse-block sums are exact,
    independent of what the coarse scientific value actually is. The caller
    multiplies the result by the real coarse value afterwards.
    """

    def __init__(self, factor: int = FACTOR, **kwargs):
        super().__init__(**kwargs)
        self.factor = factor

    def call(self, raw_weights):
        positive = tf.nn.softplus(raw_weights) + 1e-6  # (B, H, W, 1)
        block_sum = tf.nn.avg_pool2d(positive, ksize=self.factor, strides=self.factor, padding="VALID")
        block_sum = block_sum * (self.factor * self.factor)
        block_sum_upsampled = tf.repeat(tf.repeat(block_sum, self.factor, axis=1), self.factor, axis=2)
        return positive / block_sum_upsampled

    def get_config(self):
        return {**super().get_config(), "factor": self.factor}


def build_model(input_size: int, in_channels: int, factor: int = FACTOR, dropout: float = 0.15) -> keras.Model:
    inputs = keras.Input(shape=(input_size, input_size, in_channels), name="predictors")

    e1 = layers.Conv2D(20, 3, padding="same", activation="relu")(inputs)
    e1 = layers.Conv2D(20, 3, padding="same", activation="relu")(e1)  # skip @ full res

    p1 = layers.MaxPooling2D(2)(e1)  # /2
    e2 = layers.Conv2D(32, 3, padding="same", activation="relu")(p1)
    e2 = layers.Dropout(dropout)(e2)
    e2 = layers.Conv2D(32, 3, padding="same", activation="relu")(e2)  # skip @ /2

    p2 = layers.MaxPooling2D(2)(e2)  # /4 (bottleneck — still finer than the coarse grid)
    b = layers.Conv2D(48, 3, padding="same", activation="relu")(p2)
    b = layers.Dropout(dropout)(b)
    b = layers.Conv2D(48, 3, padding="same", activation="relu")(b)

    u2 = layers.UpSampling2D(2)(b)
    u2 = layers.Concatenate()([u2, e2])
    d2 = layers.Conv2D(32, 3, padding="same", activation="relu")(u2)
    d2 = layers.Dropout(dropout)(d2)

    u1 = layers.UpSampling2D(2)(d2)
    u1 = layers.Concatenate()([u1, e1])
    d1 = layers.Conv2D(20, 3, padding="same", activation="relu")(u1)

    raw_weights = layers.Conv2D(1, 1, padding="same", activation=None, name="raw_allocation_logits")(d1)
    shares = ConservationNormalize(factor=factor, name="conservation_normalize")(raw_weights)

    return keras.Model(inputs=inputs, outputs=shares, name="cc_mrsf_net_lite")


def spatial_smoothness_loss(shares: tf.Tensor) -> tf.Tensor:
    dx = shares[:, 1:, :, :] - shares[:, :-1, :, :]
    dy = shares[:, :, 1:, :] - shares[:, :, :-1, :]
    return tf.reduce_mean(tf.abs(dx)) + tf.reduce_mean(tf.abs(dy))


def make_training_step(model: keras.Model, optimizer: keras.optimizers.Optimizer, lambda_smooth: float = 0.0008):
    huber = keras.losses.Huber()

    @tf.function
    def train_step(x, y_true_shares):
        with tf.GradientTape() as tape:
            y_pred_shares = model(x, training=True)
            recon_loss = huber(y_true_shares, y_pred_shares)
            smooth_loss = spatial_smoothness_loss(y_pred_shares)
            loss = recon_loss + lambda_smooth * smooth_loss
        grads = tape.gradient(loss, model.trainable_variables)
        optimizer.apply_gradients(zip(grads, model.trainable_variables))
        return loss, recon_loss, smooth_loss

    return train_step
