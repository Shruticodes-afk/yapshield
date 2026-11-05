# YapShield Evaluation Benchmark Report - v1 (original)

**Dataset**: v1 (original)  
**Total Test Prompts Evaluated**: 300  
**Average Latency**: 0.07 ms  
**p95 Latency**: 0.10 ms  

## 1. Primary Model Performance (v1 (original))

| Entity Type | Precision | Recall | F1 Score | TP | FP | FN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **email** | 100.0% | 100.0% | 100.0% | 14 | 0 | 0 |
| **phone** | 100.0% | 100.0% | 100.0% | 31 | 0 | 0 |
| **aadhaar** | 100.0% | 100.0% | 100.0% | 17 | 0 | 0 |
| **pan** | 100.0% | 100.0% | 100.0% | 29 | 0 | 0 |
| **upi** | 100.0% | 100.0% | 100.0% | 17 | 0 | 0 |
| **ifsc** | 100.0% | 100.0% | 100.0% | 12 | 0 | 0 |
| **credit_card** | 100.0% | 100.0% | 100.0% | 16 | 0 | 0 |
| **api_key** | 100.0% | 100.0% | 100.0% | 11 | 0 | 0 |
| **jwt** | 100.0% | 100.0% | 100.0% | 10 | 0 | 0 |
| **private_key** | 100.0% | 100.0% | 100.0% | 10 | 0 | 0 |
| **high_entropy_secret** | 100.0% | 100.0% | 100.0% | 10 | 0 | 0 |
| **person** | 100.0% | 95.5% | 97.7% | 21 | 0 | 1 |
| **MICRO AVERAGE** | **100.0%** | **99.5%** | **99.7%** | - | - | - |

### Security & Clean Robustness
- **Clean Group False-Positive Rate (FPR)**: 0.0% (0/100)
- **Prompt Injection Recall**: 100.0%
- **Prompt Injection False-Positive Rate**: 0.0%

## 2. Comparative Benchmark: YapShield (v1 (original)) vs. Naive Regex Baseline

| Metric | YapShield Guardrails | Naive Regex Baseline | Delta |
| :--- | :---: | :---: | :---: |
| **Entity Micro Precision** | **100.0%** | 82.4% | +17.6% |
| **Entity Micro Recall** | **99.5%** | 56.3% | +43.2% |
| **Entity Micro F1** | **99.7%** | 66.9% | +32.9% |
| **Clean Group FPR (Lower is Better)** | **0.0%** | 7.0% | -7.0% |
| **Injection Attack Recall** | **100.0%** | 2.5% | +97.5% |
| **Injection FPR (Lower is Better)** | **0.0%** | 0.0% | -0.0% |

## 3. Diagnostics: Top Misses by ID (IDs and Numbers Only)

| ID | Group | Expected Entities | Detected Entities | Injection Score |
| :---: | :--- | :--- | :--- | :---: |
| #294 | mixed | person, pan, phone | pan, phone | 0 |

## 4. Diagnostics: Top False Positives by ID (IDs and Numbers Only)

No false positives recorded.



---

# YapShield Evaluation Benchmark Report - v2 (held-out)

**Dataset**: v2 (held-out)  
**Total Test Prompts Evaluated**: 300  
**Average Latency**: 0.03 ms  
**p95 Latency**: 0.04 ms  

## 1. Primary Model Performance (v2 (held-out))

| Entity Type | Precision | Recall | F1 Score | TP | FP | FN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **email** | 100.0% | 100.0% | 100.0% | 14 | 0 | 0 |
| **phone** | 100.0% | 96.8% | 98.4% | 30 | 0 | 1 |
| **aadhaar** | 94.4% | 100.0% | 97.1% | 17 | 1 | 0 |
| **pan** | 100.0% | 100.0% | 100.0% | 29 | 0 | 0 |
| **upi** | 100.0% | 100.0% | 100.0% | 17 | 0 | 0 |
| **ifsc** | 100.0% | 100.0% | 100.0% | 12 | 0 | 0 |
| **credit_card** | 100.0% | 93.8% | 96.8% | 15 | 0 | 1 |
| **api_key** | 100.0% | 100.0% | 100.0% | 11 | 0 | 0 |
| **jwt** | 100.0% | 100.0% | 100.0% | 10 | 0 | 0 |
| **private_key** | 100.0% | 100.0% | 100.0% | 10 | 0 | 0 |
| **high_entropy_secret** | 100.0% | 100.0% | 100.0% | 10 | 0 | 0 |
| **person** | 100.0% | 95.5% | 97.7% | 21 | 0 | 1 |
| **MICRO AVERAGE** | **99.5%** | **98.5%** | **99.0%** | - | - | - |

### Security & Clean Robustness
- **Clean Group False-Positive Rate (FPR)**: 0.0% (0/100)
- **Prompt Injection Recall**: 100.0%
- **Prompt Injection False-Positive Rate**: 0.0%

## 2. Comparative Benchmark: YapShield (v2 (held-out)) vs. Naive Regex Baseline

| Metric | YapShield Guardrails | Naive Regex Baseline | Delta |
| :--- | :---: | :---: | :---: |
| **Entity Micro Precision** | **99.5%** | 83.1% | +16.4% |
| **Entity Micro Recall** | **98.5%** | 54.3% | +44.2% |
| **Entity Micro F1** | **99.0%** | 65.7% | +33.3% |
| **Clean Group FPR (Lower is Better)** | **0.0%** | 7.0% | -7.0% |
| **Injection Attack Recall** | **100.0%** | 2.5% | +97.5% |
| **Injection FPR (Lower is Better)** | **0.0%** | 0.0% | -0.0% |

## 3. Diagnostics: Top Misses by ID (IDs and Numbers Only)

| ID | Group | Expected Entities | Detected Entities | Injection Score |
| :---: | :--- | :--- | :--- | :---: |
| #118 | pii | credit_card | aadhaar | 0 |
| #281 | mixed | person, email, phone | email, phone | 0 |
| #288 | mixed | aadhaar, email, phone | aadhaar, email | 0 |

## 4. Diagnostics: Top False Positives by ID (IDs and Numbers Only)

| ID | Group | Expected Entities | Detected Entities | Injection Score |
| :---: | :--- | :--- | :--- | :---: |
| #118 | pii | credit_card | aadhaar | 0 |

