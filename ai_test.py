#!/usr/bin/env python3
"""
Standalone test for compAnIonv1 grooming detection model.

SETUP (first time only):
  1. pip install tensorflow "transformers==4.17" huggingface_hub
  2. Install git-lfs: https://git-lfs.com
  3. git lfs install
  4. git clone https://huggingface.co/chatcompanion/compAnIonv1  (downloads ~450 MB weights)

Then run this script from the repo root, or set MODEL_DIR below.
"""

import sys
import os

# ── Config ─────────────────────────────────────────────────────────────────────
# Path to the cloned compAnIonv1 repo directory
# Change this if you cloned it somewhere else
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'compAnIonv1')
WEIGHTS_FILE = os.path.join(MODEL_DIR, 'bert_cnn_ensemble_resample_uncased_mdl.h5')

# ── Dependency checks ──────────────────────────────────────────────────────────
print("Checking dependencies...")

try:
    import tensorflow as tf
    print(f"  TensorFlow: {tf.__version__}")
except ImportError:
    print("ERROR: TensorFlow not installed.")
    print("  Run: pip install tensorflow")
    sys.exit(1)

try:
    from transformers import BertTokenizer, TFBertModel
    import transformers
    print(f"  Transformers: {transformers.__version__}")
except ImportError:
    print("ERROR: transformers not installed.")
    print("  Run: pip install \"transformers==4.17\"")
    sys.exit(1)

if not os.path.isfile(WEIGHTS_FILE):
    print(f"\nERROR: Weights file not found at: {WEIGHTS_FILE}")
    print("\nTo download the model:")
    print("  1. Install git-lfs: https://git-lfs.com")
    print("  2. git lfs install")
    print(f"  3. git clone https://huggingface.co/chatcompanion/compAnIonv1  (into {os.path.dirname(__file__)})")
    print("     (downloads ~450 MB — requires git-lfs)")
    sys.exit(1)

# ── Model definition ───────────────────────────────────────────────────────────
MAX_SEQUENCE_LENGTH = 400

def create_model(bert_model):
    bert_model.trainable = False

    input_ids      = tf.keras.layers.Input(shape=(MAX_SEQUENCE_LENGTH,), dtype=tf.int64, name='input_ids')
    token_type_ids = tf.keras.layers.Input(shape=(MAX_SEQUENCE_LENGTH,), dtype=tf.int64, name='token_type_ids')
    attention_mask = tf.keras.layers.Input(shape=(MAX_SEQUENCE_LENGTH,), dtype=tf.int64, name='attention_mask')

    bert_out  = bert_model({'input_ids': input_ids,
                            'token_type_ids': token_type_ids,
                            'attention_mask': attention_mask})
    cnn_input = bert_out[0]  # (batch, seq_len, 768)

    kernel_sizes = [3, 4, 5, 10]
    num_filters  = [100, 100, 50, 25]
    conv_layers  = []
    for kernel_size, filters in zip(kernel_sizes, num_filters):
        conv = tf.keras.layers.Conv1D(filters=filters, kernel_size=kernel_size, activation='relu')(cnn_input)
        conv = tf.keras.layers.GlobalMaxPooling1D()(conv)
        conv_layers.append(conv)

    x = tf.keras.layers.concatenate(conv_layers, axis=1)
    x = tf.keras.layers.Dense(200, activation='relu', name='hidden_layer')(x)
    x = tf.keras.layers.Dropout(0.1)(x)
    x = tf.keras.layers.Dense(100, activation='relu', name='hidden_layer2')(x)
    x = tf.keras.layers.Dropout(0.1)(x)
    output = tf.keras.layers.Dense(1, activation='sigmoid', name='classification_layer')(x)

    model = tf.keras.Model(inputs=[input_ids, token_type_ids, attention_mask], outputs=[output])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss=tf.keras.losses.BinaryFocalCrossentropy(gamma=2.0, from_logits=False,
                                                      apply_class_balancing=True,
                                                      label_smoothing=0.03),
        metrics=['accuracy']
    )
    return model

# ── Load model ─────────────────────────────────────────────────────────────────
print("\nLoading BERT tokenizer (bert-base-uncased, ~450 MB first run)...")
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
print("Tokenizer loaded.")

print("Loading BERT backbone...")
bert = TFBertModel.from_pretrained('bert-base-uncased')
print("BERT backbone loaded.")

print("Building custom CNN model and loading weights...")
model = create_model(bert)
model.load_weights(WEIGHTS_FILE)
print("Model loaded successfully!\n")

# ── Inference helper ───────────────────────────────────────────────────────────
def predict(texts):
    tokenized = tokenizer(
        texts,
        max_length=MAX_SEQUENCE_LENGTH,
        truncation=True,
        padding='max_length',
        return_tensors='tf'
    )
    preds = model.predict(
        [tokenized.input_ids, tokenized.token_type_ids, tokenized.attention_mask],
        verbose=0
    )
    return preds.flatten().tolist()

# ── Test messages ──────────────────────────────────────────────────────────────
test_cases = [
    # (message, expected)
    ("gg nice shot bro",                                                  "safe"),
    ("lets go team we almost won",                                        "safe"),
    ("what is your username",                                             "safe"),
    ("do you want to trade items",                                        "safe"),
    ("how old are you",                                                   "grooming"),
    ("don't tell your parents about this",                                "grooming"),
    ("add me on discord we can play together just us",                    "grooming"),
    ("you're so mature for your age I really like you",                   "grooming"),
    ("when are you alone at home",                                        "grooming"),
    ("lets meet up in real life I'll pick you up",                        "grooming"),
    ("send me a photo of yourself",                                       "grooming"),
    ("I'll give you free robux just keep this between us",                "grooming"),
    # Bypass attempts that rule-based would miss
    ("hw old r u",                                                        "grooming"),
    ("dnt tel ur parnts abt dis",                                         "grooming"),
    ("ur so matur 4 ur age i rly like u",                                 "grooming"),
    ("wen r u home alone",                                                "grooming"),
    ("add me on disc0rd jst us 2",                                        "grooming"),
]

THRESHOLD = 0.5

print("=" * 70)
print(f"  {'Message':<45} {'Expected':<10} {'AI Result':<10} {'Score'}")
print("=" * 70)

correct = 0
total   = len(test_cases)

messages = [m for m, _ in test_cases]
scores   = predict(messages)

for (message, expected), score in zip(test_cases, scores):
    ai_label = 'grooming' if score >= THRESHOLD else 'safe'
    match    = ai_label == expected
    if match:
        correct += 1

    status    = 'OK  ' if match else 'MISS'
    short_msg = message[:44] + '...' if len(message) > 44 else message
    print(f"  [{status}] {short_msg:<45} {expected:<10} {ai_label:<10} {score:.3f}")

print("=" * 70)
print(f"\n  Accuracy: {correct}/{total} ({(correct/total)*100:.0f}%)")

if correct / total >= 0.8:
    print("  Model performing well - ready for integration.")
elif correct / total >= 0.6:
    print("  Model partially working - review missed cases before integrating.")
else:
    print("  Model accuracy too low - investigate before integrating.")
print()
