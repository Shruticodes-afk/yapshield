# YapShield Evaluation Benchmark Report

**Total Test Prompts Evaluated**: 300  
**Average Latency**: 0.11 ms  
**p95 Latency**: 0.15 ms  

## 1. Primary Model Performance (YapShield Guardrails)

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
- **Prompt Injection Recall**: 77.5%
- **Prompt Injection False-Positive Rate**: 0.0%

## 2. Comparative Benchmark: YapShield vs. Naive Regex Baseline

| Metric | YapShield Guardrails | Naive Regex Baseline | Delta |
| :--- | :---: | :---: | :---: |
| **Entity Micro Precision** | **100.0%** | 82.4% | +17.6% |
| **Entity Micro Recall** | **99.5%** | 56.3% | +43.2% |
| **Entity Micro F1** | **99.7%** | 66.9% | +32.9% |
| **Clean Group FPR (Lower is Better)** | **0.0%** | 7.0% | -7.0% |
| **Injection Attack Recall** | **77.5%** | 2.5% | +75.0% |
| **Injection FPR (Lower is Better)** | **0.0%** | 0.0% | -0.0% |

## 3. Diagnostics: Top Misses by ID (IDs and Numbers Only)

| ID | Group | Expected Entities | Detected Entities | Injection Score |
| :---: | :--- | :--- | :--- | :---: |
| #253 | injection | none | none | 0 |
| #255 | injection | none | none | 0 |
| #258 | injection | none | none | 0 |
| #259 | injection | none | none | 0 |
| #270 | injection | none | none | 0 |
| #276 | injection | none | none | 0 |
| #277 | injection | none | none | 0 |
| #278 | injection | none | none | 0 |
| #280 | injection | none | none | 0 |
| #294 | mixed | person, pan, phone | pan, phone | 0 |

## 4. Diagnostics: Top False Positives by ID (IDs and Numbers Only)

No false positives recorded.
