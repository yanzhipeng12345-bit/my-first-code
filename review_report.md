# Iron Tracker 打包检查报告 (Review Report)

**检查日期**: 2025-01-03  
**检查人**: v2.5 实现负责人  
**源包版本**: irontracker_full_export_20250102.tar.gz  
**源码版本**: v4.5.1 (需升级至 v2.5 规范)

---

## 1. 根目录文件与文件夹清单

### 📁 目录结构

```
irontracker_export_20260102/
├── README.md                    # 主入口文档
├── DELIVERY_CHECKLIST.md        # 交付检查清单
├── core/                        # ⭐ 核心算法
│   ├── calories.py              # 主算法 (v4.5.1)
│   └── config.yaml              # 配置参数
├── frontend/                    # ⭐ 前端源码
│   ├── src/                     # React 源代码
│   │   ├── pages/               # 页面组件
│   │   │   ├── Home.tsx
│   │   │   ├── History.tsx      # 训练日志（含热量展示）
│   │   │   ├── Stats.tsx        # 进度分析
│   │   │   ├── Logger.tsx       # 训练记录器
│   │   │   ├── Settings.tsx     # 设置
│   │   │   ├── ExerciseList.tsx
│   │   │   └── NotFound.tsx
│   │   ├── components/          # UI 组件
│   │   ├── lib/
│   │   │   ├── calorieCalculator.ts  # ⭐ 前端热量计算器 (v4.5.1)
│   │   │   ├── db.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   └── contexts/
│   └── build_instructions.md    # 构建说明
├── infra/                       # 基础设施
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── k8s/                     # Kubernetes 配置（占位）
│   └── ci_cd/                   # CI/CD 配置（占位）
├── db/                          # 数据库
│   └── schema.sql               # 数据库 Schema
├── examples/                    # ⭐ 示例文件
│   ├── sample_input_1.json      # 标准训练场景
│   ├── sample_input_2.json      # 后编辑场景
│   ├── sample_output_1.json     # 预期输出
│   └── run_example.sh           # 自动测试脚本
├── tests/                       # ⭐ 测试
│   └── test_calories.py         # 单元测试 (20+ tests)
└── docs/                        # 文档
    ├── ALGORITHM_SPEC.md        # 算法规范 (v4.5.1)
    └── RUNBOOK.md               # 部署运维手册
```

---

## 2. 关键文件分析

### 2.1 核心算法 (`core/calories.py`)

| 项目 | 现状 (v4.5.1) | v2.5 要求 | 状态 |
|------|---------------|-----------|------|
| 强度因子 (IF) | ✅ 有实现 (`calculate_intensity_factor`) | 需校准公式 | ⚠️ 需更新 |
| 无感推断休息时间 | ❌ 未实现 | `inferred_rest_seconds` | ❌ 缺失 |
| 做组/休息时间拆分 | ❌ 未实现 | `doing_seconds` / `rest_seconds` | ❌ 缺失 |
| Cardio 自动识别 | ✅ 有实现 | 需校准 MET 表 | ⚠️ 需更新 |
| MET 表 | ✅ 有实现 | 需按 v2.5 规范更新 | ⚠️ 需更新 |
| API 接口 | ❌ 无标准接口 | `compute_session_calories()` | ❌ 缺失 |

**现有算法问题**:
- 使用"整段时间 × 固定 MET"逻辑，未区分做组与休息时间
- 缺少 `inferred_rest_seconds` 推断逻辑
- 输出格式不符合 v2.5 规范

### 2.2 前端热量计算器 (`frontend/src/lib/calorieCalculator.ts`)

| 项目 | 现状 | v2.5 要求 | 状态 |
|------|------|-----------|------|
| 做组时间计算 | ✅ `SECONDS_PER_REP: 3.0` | 需校准 | ⚠️ |
| 休息时间计算 | ✅ `SECONDS_REST_PER_SET: 90` | 需支持 `explicit_rest_seconds` | ⚠️ |
| 热量上限 | ✅ `MAX_CALORIE_MULTIPLIER: 12` | 需改为 `BW * 8` | ⚠️ |
| 分项明细展示 | ❌ 未实现 | `doing_cal`, `rest_cal`, `IF`, `MET_work` | ❌ 缺失 |

### 2.3 示例文件 (`examples/`)

| 文件 | 存在 | 内容 |
|------|------|------|
| sample_input_1.json | ✅ | 标准 60 分钟混合训练 |
| sample_input_2.json | ✅ | 后编辑场景（腿部 + 晚间有氧） |
| sample_output_1.json | ✅ | v4.5.1 格式输出 |
| example_inputs.json | ❌ | **缺失** - 需创建 v2.5 格式 |
| example_outputs.json | ❌ | **缺失** - 需创建 v2.5 格式 |

### 2.4 测试文件 (`tests/test_calories.py`)

| 测试类别 | 现有测试 | v2.5 要求 |
|----------|----------|-----------|
| BMR 计算 | ✅ 3 tests | 保留 |
| BMR 因子 | ✅ 2 tests | 保留 |
| 强度因子 | ✅ 3 tests | 需更新公式 |
| 有效时长 | ✅ 3 tests | 保留 |
| 完整计算 | ✅ 4 tests | 需更新为 v2.5 |
| 回归测试 | ✅ 3 tests | 需更新预期值 |
| 边界情况 | ✅ 2 tests | 需增加 |
| **纯力量短时** | ❌ | **缺失** |
| **混合力量+有氧** | ⚠️ 部分 | 需完善 |
| **极端负重低次** | ❌ | **缺失** |
| **时间不一致警告** | ❌ | **缺失** |

---

## 3. 缺失项清单

### 3.1 核心算法缺失

1. **`inferred_rest_seconds` 推断逻辑**
   - 需根据组数自动推断休息时间
   - 公式: `inferred_rest = (sets - 1) * default_rest_per_set`

2. **做组/休息时间拆分**
   - `doing_seconds = sets * reps * seconds_per_rep`
   - `rest_seconds = explicit_rest_seconds || inferred_rest_seconds`

3. **v2.5 MET 表**
   - 需要 `MET_work` (做组 MET) 和 `MET_rest` (休息 MET) 分离

4. **`compute_session_calories()` API**
   - 标准入口函数
   - 返回 v2.5 规范结构

### 3.2 输出格式缺失

需要的输出结构:
```json
{
  "total_calories": 487.5,
  "breakdown": [
    {
      "action_id": "action_1",
      "exercise": "Bench Press",
      "doing_cal": 85.2,
      "rest_cal": 23.1,
      "IF": 1.15,
      "MET_work": 5.1
    }
  ],
  "cardio_breakdown": [...],
  "warnings": [],
  "metadata": {
    "version": "v2.5"
  }
}
```

### 3.3 防错机制缺失

1. **热量上限**: `total_calories ≤ BW * 8`
2. **时间不一致警告**: `time_mismatch_warning` (>20% 差距)
3. **`explicit_rest_seconds` 优先级**

### 3.4 文档缺失

1. **CHANGELOG.md** - 版本变更记录
2. **example_inputs.json** - v2.5 格式输入示例
3. **example_outputs.json** - v2.5 格式输出示例

---

## 4. 入口文件与运行方式

### 4.1 算法入口

```bash
# 现有方式
python core/calories.py examples/sample_input_1.json

# v2.5 要求
python core/calories_v25.py --input session.json --weight 75
```

### 4.2 前端运行

```bash
cd frontend
npm install
npm run dev  # 开发模式
npm run build  # 生产构建
```

### 4.3 测试运行

```bash
pip install pytest pyyaml
pytest tests/test_calories.py -v
```

---

## 5. 疑问与确认事项

### 5.1 算法参数确认

| 参数 | 现有值 | 建议 v2.5 值 | 需确认 |
|------|--------|--------------|--------|
| `SECONDS_PER_REP` | 3.0 | 3.0 | ✅ |
| `DEFAULT_REST_PER_SET` | 90s | 90s | ✅ |
| `MET_IDLE` | 1.8 | 1.5 | ⚠️ 需确认 |
| `MAX_CAL_MULTIPLIER` | 12 | 8 | ⚠️ 需确认 |
| `TIME_MISMATCH_THRESHOLD` | N/A | 20% | ✅ |

### 5.2 UI 展示确认

1. 热量下方文案是否使用: "估算值（已区分做组与休息时间）"？
2. 警告提示颜色: 黄色 (轻微) / 红色 (严重)？
3. 是否需要展示 `inferred_rest_seconds` 具体值？

### 5.3 兼容性确认

1. 是否需要保留 v4.5.1 旧接口兼容？
2. 前端是否需要版本切换功能？

---

## 6. 实施计划

### Phase 1: 核心算法 (v2.5)
- [ ] 创建 `core/calories_v25.py`
- [ ] 实现 `inferred_rest_seconds` 推断
- [ ] 实现做组/休息时间拆分
- [ ] 更新 MET 表
- [ ] 实现 `compute_session_calories()` API

### Phase 2: 防错机制
- [ ] 热量上限 (BW * 8)
- [ ] 时间不一致警告
- [ ] `explicit_rest_seconds` 优先级

### Phase 3: 前端更新
- [ ] 更新 `calorieCalculator.ts`
- [ ] 展示分项明细
- [ ] 添加警告提示
- [ ] 添加估算值文案

### Phase 4: 测试与文档
- [ ] 更新单元测试
- [ ] 创建 `example_inputs.json` / `example_outputs.json`
- [ ] 更新 `docs/README.md`
- [ ] 创建 `CHANGELOG.md`

### Phase 5: Demo 与交付
- [ ] 创建 Demo 页面
- [ ] 截图
- [ ] 打包

---

## 7. 结论

**当前状态**: 源码为 v4.5.1 版本，需要按 v2.5 规范进行重构。

**主要工作**:
1. 重写核心算法，实现做组/休息时间拆分
2. 新增 `inferred_rest_seconds` 推断逻辑
3. 实现标准 `compute_session_calories()` API
4. 更新前端展示分项明细
5. 完善测试和文档

**预计交付**: 完整 v2.5 实现 + Demo + 文档

---

**检查完成**: 2025-01-03  
**下一步**: 开始实现 v2.5 核心算法
