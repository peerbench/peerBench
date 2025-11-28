# peerBench

![NPM Version](https://img.shields.io/npm/v/peerbench?color=green)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fpeerbench.ai&label=peerbench.ai&color=blue)
![Whitepaper](https://img.shields.io/badge/arxiv_paper-red?link=https%3A%2F%2Farxiv.org%2Fabs%2F2510.07575)

A decentralized AI model benchmarking platform that addresses industry-wide overfitting issues through continuous validation with private test data and publicly auditable scoring.

> **📄 Research Paper:** Our approach is detailed in our paper accepted to NeurIPS 2025: ["Benchmarking is Broken -- Don't Let AI be its Own Judge"](https://arxiv.org/abs/2510.07575)

<img src="assets/overall-diagram.png" alt="Overall Architecture" width="700" />

## The Problem

Public benchmark test data sets make AI model performance comparable. However, this creates an incentive for closed source models to cheat the benchmarks by training on test data or creating heuristics that overfit the benchmark test dataset.

## Our Solution

A network of independent experts validating models continuously with newly generated private test data and scoring that can be publicly audited.

## Addressing Industry Wide Overfitting of AI Models

Another very important piece of context in accelerating AI innovation is **Model Overfitting plaguing the AI industry**.

Public benchmark test data sets make AI model performance comparable. But this creates an incentivization for closed source models in particular to game the benchmarks by creating heuristics for them or overfitting their training data to include solutions to the known testsets.

For open source models **Dynabench**[^45] tries to solve the problem of overfitting on test datasets with a community of humans **intentionally creating new test data designed to be hard for models**. But Dynabench only works with open source models. Additionally Dynabench has not seen significant adoption even after being managed by mlCommons. We believe this lack of traction is due to a lack of incentives for evaluators or AI model owners to participate.

Requiring recency of test data is another approach taken by LiveBench[^48] but it is primarily focused on the problem of LLM's accidentally including test data as part of training. A malicious actor can still overfit liveBench within days of the test data being released. And as they are a single entity they can be covertly bribed to give out the test data to one AI provider before the release. But the idea of releasing new test data continuously is something we agree with and will also push for in our standard.

**Centralized private test data evaluation** is another approach that has been attempted to resolve the problem of AI companies gaming benchmark results. One currently active private evaluator is the SEAL LLM Leaderboards[^46] by Scale.ai[^47]. However, this lacks the transparency and audibility to be fully trustworthy and widely used as a standard.

**Decentralized systems are strongly positioned to solve** all of those issues thanks to providing proper incentivization to all parties involved while leveraging blockchains' decentralization and transparency. **Private datasets** still can be a fundamental **part of the validation strategy**.

## References

[^45]: Dynabench - https://arxiv.org/abs/2104.14337

[^46]: SEAL LLM Leaderboards - https://scale.com/leaderboard

[^47]: Scale.ai - https://scale.com/

[^48]: LiveBench - https://livebench.ai/#/
