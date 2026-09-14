import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  Drawer,
  Space,
  Button,
  Select,
  Switch,
  Typography,
  Popconfirm,
  Flex,
  Tooltip,
  Divider,
} from 'antd';
import {
  FilterOutlined,
  ClearOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';

import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectAdvancedFilterDrawerOpen,
  selectFilterConditions,
  selectCourses,
  selectLabels,
  selectSimpleFilterMode,
  selectSelectedTimeSlots,
} from '@/store/selectors';
import {
  setAdvancedFilterDrawerOpen,
  setFilterConditions,
  clearAllFilterConditions,
  setSimpleFilterMode,
  setSelectedTimeSlots,
  clearAllTimeSlotFilters,
} from '@/store/slices/uiSlice';
import type { FilterCondition, TimeSlotFilter } from '@/store/slices/uiSlice';
import {
  AdvancedFilterService,
  type FieldOptions,
} from '@/services/advancedFilterService';
import { timeSlot } from '@/constants';
import { useTranslation } from '@/hooks';
import type { TranslationKey } from '@/types';

const { Text } = Typography;

const StyledDrawer = styled(Drawer)`
  .ant-drawer-header {
    padding: 6px 8px;
  }

  .ant-drawer-body {
    padding: 8px;
  }
`;

const FilterRow = styled.div<{ $enabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: ${(props) =>
    props.$enabled ? 'var(--ant-color-primary-bg)' : 'transparent'};
  border: 1px solid
    ${(props) =>
      props.$enabled
        ? 'var(--ant-color-primary-border)'
        : 'var(--ant-color-border)'};
  transition: all 0.2s ease;
  margin-bottom: 6px;

  &:hover {
    border-color: var(--ant-color-primary-border-hover);
  }
`;

const FieldLabel = styled(Text)`
  min-width: 42px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  color: var(--ant-color-primary);
`;

const TimeFieldLabel = styled(Text)`
  min-width: 42px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  color: var(--ant-color-warning);
`;

const TimeFilterRow = styled.div<{ $hasValue: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: ${(props) =>
    props.$hasValue ? 'var(--ant-color-warning-bg)' : 'transparent'};
  border: 1px solid
    ${(props) =>
      props.$hasValue
        ? 'var(--ant-color-warning-border)'
        : 'var(--ant-color-border)'};
  transition: all 0.2s ease;
  margin-bottom: 6px;

  &:hover {
    border-color: var(--ant-color-warning-border-hover);
  }
`;

// 簡易篩選的欄位配置
// 'tags' = Select with mode='tags' (autocomplete + free text)
// 'select' = Select with mode='multiple' (strict options only)
// labelKey maps to i18n key: simpleFilter.fields.<labelKey>
const SIMPLE_FILTER_FIELDS = [
  { field: 'name', labelKey: 'name', inputType: 'tags' as const },
  { field: 'teacher', labelKey: 'teacher', inputType: 'tags' as const },
  { field: 'tags', labelKey: 'tags', inputType: 'tags' as const },
  { field: 'department', labelKey: 'department', inputType: 'select' as const },
  { field: 'grade', labelKey: 'grade', inputType: 'select' as const },
  { field: 'class', labelKey: 'class', inputType: 'select' as const },
  { field: 'credit', labelKey: 'credit', inputType: 'select' as const },
  { field: 'compulsory', labelKey: 'compulsory', inputType: 'select' as const },
  { field: 'english', labelKey: 'english', inputType: 'select' as const },
];

// 星期選項 keys (day options for column filter). Labels are resolved via i18n.
const WEEKDAY_OPTION_KEYS: { labelKey: TranslationKey; value: number }[] = [
  { labelKey: 'weekdays.mon', value: 0 },
  { labelKey: 'weekdays.tue', value: 1 },
  { labelKey: 'weekdays.wed', value: 2 },
  { labelKey: 'weekdays.thu', value: 3 },
  { labelKey: 'weekdays.fri', value: 4 },
  { labelKey: 'weekdays.sat', value: 5 },
  { labelKey: 'weekdays.sun', value: 6 },
];

// 節次選項 (period options for row filter)
const PERIOD_OPTIONS = timeSlot.map((slot) => ({
  label: slot.key,
  value: slot.key,
}));

// 管理每一列的本地狀態
interface SimpleFilterRowState {
  field: string;
  type: 'include' | 'exclude';
  value: string | string[];
  enabled: boolean;
}

const SimpleFilterDrawer: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectAdvancedFilterDrawerOpen);
  const filterConditions = useAppSelector(selectFilterConditions);
  const courses = useAppSelector(selectCourses);
  const labels = useAppSelector(selectLabels);
  const simpleFilterMode = useAppSelector(selectSimpleFilterMode);
  const selectedTimeSlots = useAppSelector(selectSelectedTimeSlots);

  // 動態計算篩選選項
  const fieldOptions = useMemo(() => {
    return AdvancedFilterService.getFilterOptions(courses, labels);
  }, [courses, labels]);

  // 初始化與同步本地狀態 —— 從 Redux filterConditions 反推出每一列的狀態
  const [rowStates, setRowStates] = useState<SimpleFilterRowState[]>(() =>
    initRowStatesFromConditions(filterConditions),
  );

  // 只在 drawer 打開時同步一次
  useEffect(() => {
    if (open && simpleFilterMode) {
      setRowStates(initRowStatesFromConditions(filterConditions));
    }
  }, [open, simpleFilterMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // 從 filterConditions 反推出每一列的初始值
  function initRowStatesFromConditions(
    conditions: FilterCondition[],
  ): SimpleFilterRowState[] {
    return SIMPLE_FILTER_FIELDS.map((fieldDef) => {
      // 找到已有的 condition（如果有的話）
      const existingCondition = conditions.find(
        (c) => c.field === fieldDef.field,
      );
      if (existingCondition) {
        return {
          field: fieldDef.field,
          type: existingCondition.type,
          value: existingCondition.value,
          enabled: true,
        };
      }
      return {
        field: fieldDef.field,
        type: 'include' as const,
        value: [],
        enabled: false,
      };
    });
  }

  // 把本地的 rowStates 同步回 Redux
  const syncToRedux = useCallback(
    (states: SimpleFilterRowState[]) => {
      // 只保留 enabled 且有值的篩選條件
      const conditions: FilterCondition[] = states
        .filter((row) => {
          if (!row.enabled) return false;
          if (Array.isArray(row.value)) return row.value.length > 0;
          return typeof row.value === 'string' && row.value.trim() !== '';
        })
        .map((row) => ({
          field: row.field,
          type: row.type,
          value: row.value,
        }));

      // 保留不屬於 simple mode 管理的 conditions（例如手動在 advanced mode 加的其他 field）
      const simpleFields = new Set(SIMPLE_FILTER_FIELDS.map((f) => f.field));
      const otherConditions = filterConditions.filter(
        (c) => !simpleFields.has(c.field),
      );

      dispatch(setFilterConditions([...otherConditions, ...conditions]));
    },
    [dispatch, filterConditions],
  );

  const handleRowUpdate = useCallback(
    (index: number, updates: Partial<SimpleFilterRowState>) => {
      setRowStates((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...updates };
        // 立即同步到 Redux
        syncToRedux(next);
        return next;
      });
    },
    [syncToRedux],
  );

  const handleToggleType = useCallback(
    (index: number) => {
      setRowStates((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          type: next[index].type === 'include' ? 'exclude' : 'include',
        };
        syncToRedux(next);
        return next;
      });
    },
    [syncToRedux],
  );

  const handleToggleEnabled = useCallback(
    (index: number, enabled: boolean) => {
      setRowStates((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], enabled };
        syncToRedux(next);
        return next;
      });
    },
    [syncToRedux],
  );

  // 時間篩選的本地狀態 — 獨立追蹤選中的星期和節次
  const [filterDays, setFilterDays] = useState<number[]>([]);
  const [filterPeriods, setFilterPeriods] = useState<string[]>([]);

  // 從 selectedTimeSlots 反推初始化（drawer 開啟時）
  useEffect(() => {
    if (open && simpleFilterMode) {
      // 嘗試從 selectedTimeSlots 反推出 days 和 periods
      if (selectedTimeSlots.length === 0) {
        setFilterDays([]);
        setFilterPeriods([]);
        return;
      }

      // 找出哪些 day 和 period 出現在 selectedTimeSlots
      const daysInSlots = new Set(selectedTimeSlots.map((s) => s.day));
      const periodsInSlots = new Set(selectedTimeSlots.map((s) => s.timeSlot));

      // 檢查是否為 cross product (days × periods === selectedTimeSlots.length)
      const isCrossProduct =
        daysInSlots.size * periodsInSlots.size === selectedTimeSlots.length &&
        Array.from(daysInSlots).every((day) =>
          Array.from(periodsInSlots).every((period) =>
            selectedTimeSlots.some(
              (s) => s.day === day && s.timeSlot === period,
            ),
          ),
        );

      if (isCrossProduct) {
        const allPeriodKeys = timeSlot.map((s) => s.key);
        const allDays = [0, 1, 2, 3, 4, 5, 6];

        // 如果是全部 periods → 只有 days 被選
        const isAllPeriods =
          periodsInSlots.size === allPeriodKeys.length &&
          allPeriodKeys.every((p) => periodsInSlots.has(p));
        // 如果是全部 days → 只有 periods 被選
        const isAllDays =
          daysInSlots.size === allDays.length &&
          allDays.every((d) => daysInSlots.has(d));

        if (isAllPeriods && !isAllDays) {
          // 只有 days 被選
          setFilterDays(Array.from(daysInSlots));
          setFilterPeriods([]);
        } else if (isAllDays && !isAllPeriods) {
          // 只有 periods 被選
          setFilterDays([]);
          setFilterPeriods(Array.from(periodsInSlots));
        } else {
          // 兩者都有選
          setFilterDays(Array.from(daysInSlots));
          setFilterPeriods(Array.from(periodsInSlots));
        }
      } else {
        // 不是 cross product → 無法反推，清空本地狀態
        setFilterDays([]);
        setFilterPeriods([]);
      }
    }
  }, [open, simpleFilterMode, selectedTimeSlots]);

  // 從 filterDays + filterPeriods 計算出 selectedTimeSlots（cross product）
  const syncTimeFilterToRedux = useCallback(
    (days: number[], periods: string[]) => {
      const allPeriodKeys = timeSlot.map((s) => s.key);
      const allDays = [0, 1, 2, 3, 4, 5, 6];

      // 決定最終的 days 和 periods
      const effectiveDays = days.length > 0 ? days : allDays;
      const effectivePeriods = periods.length > 0 ? periods : allPeriodKeys;

      // 如果兩者都為空 → 清空
      if (days.length === 0 && periods.length === 0) {
        dispatch(clearAllTimeSlotFilters());
        return;
      }

      // 產生 cross product
      const result: TimeSlotFilter[] = [];
      for (const day of effectiveDays) {
        for (const period of effectivePeriods) {
          result.push({ day, timeSlot: period });
        }
      }

      dispatch(setSelectedTimeSlots(result));
    },
    [dispatch],
  );

  // 處理「星期」變更
  const handleDayFilterChange = useCallback(
    (newDays: number[]) => {
      setFilterDays(newDays);
      syncTimeFilterToRedux(newDays, filterPeriods);
    },
    [syncTimeFilterToRedux, filterPeriods],
  );

  // 處理「節次」變更
  const handlePeriodFilterChange = useCallback(
    (newPeriods: string[]) => {
      setFilterPeriods(newPeriods);
      syncTimeFilterToRedux(filterDays, newPeriods);
    },
    [syncTimeFilterToRedux, filterDays],
  );

  const handleClearAll = () => {
    dispatch(clearAllFilterConditions());
    dispatch(clearAllTimeSlotFilters());
    setFilterDays([]);
    setFilterPeriods([]);
    setRowStates(initRowStatesFromConditions([]));
  };

  const hasAnyFilter =
    filterConditions.length > 0 || selectedTimeSlots.length > 0;

  const handleClose = () => {
    dispatch(setAdvancedFilterDrawerOpen(false));
  };

  const handleSwitchToAdvanced = () => {
    dispatch(setSimpleFilterMode(false));
  };

  const getFieldOptionsByField = (field: string): FieldOptions | undefined => {
    return fieldOptions.find((f) => f.field === field);
  };

  if (!simpleFilterMode) return null;

  return (
    <StyledDrawer
      title={
        <Space>
          <FilterOutlined />
          <span>{t('simpleFilter.title')}</span>
        </Space>
      }
      placement='left'
      mask={false}
      maskClosable={false}
      open={open}
      onClose={handleClose}
      width={360}
      extra={
        <Space>
          <Space size={4}>
            <Typography.Text style={{ fontSize: '12px' }}>
              {t('simpleFilter.simpleMode')}
            </Typography.Text>
            <Switch
              size='small'
              checked={true}
              onChange={(checked) => {
                if (!checked) handleSwitchToAdvanced();
              }}
            />
          </Space>
          <Popconfirm
            title={t('simpleFilter.clearAll')}
            onConfirm={handleClearAll}
            okText={t('simpleFilter.clear')}
            cancelText={t('simpleFilter.cancel')}
          >
            <Button
              type='text'
              icon={<ClearOutlined />}
              disabled={!hasAnyFilter}
              danger={hasAnyFilter}
              size='small'
            />
          </Popconfirm>
        </Space>
      }
    >
      <Flex vertical gap={2}>
        {/* 時間篩選特殊區域 */}
        <Divider
          orientation='start'
          style={{ margin: '4px 0', fontSize: '12px' }}
        >
          <Space size={4}>
            <ClockCircleOutlined
              style={{ color: 'var(--ant-color-warning)' }}
            />
            <span>{t('simpleFilter.timeFilter.title')}</span>
          </Space>
        </Divider>
        <Text
          type='secondary'
          style={{ fontSize: '11px', marginBottom: '4px', lineHeight: 1.4 }}
        >
          {t('simpleFilter.timeFilter.description')}
        </Text>

        {/* 星期篩選 (column) */}
        <TimeFilterRow $hasValue={filterDays.length > 0}>
          <TimeFieldLabel>{t('simpleFilter.timeFilter.day')}</TimeFieldLabel>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Select
              size='small'
              mode='multiple'
              placeholder={t('simpleFilter.timeFilter.dayPlaceholder')}
              value={filterDays}
              onChange={handleDayFilterChange}
              options={WEEKDAY_OPTION_KEYS.map((opt) => ({
                label: t(opt.labelKey),
                value: opt.value,
              }))}
              allowClear
              maxTagCount={3}
              maxTagPlaceholder={(omitted) => `+${omitted.length}`}
              style={{ width: '100%' }}
            />
          </div>
        </TimeFilterRow>

        {/* 節次篩選 (row) */}
        <TimeFilterRow $hasValue={filterPeriods.length > 0}>
          <TimeFieldLabel>{t('simpleFilter.timeFilter.period')}</TimeFieldLabel>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Select
              size='small'
              mode='multiple'
              placeholder={t('simpleFilter.timeFilter.periodPlaceholder')}
              value={filterPeriods}
              onChange={handlePeriodFilterChange}
              options={PERIOD_OPTIONS.map((opt) => ({
                label: opt.label,
                value: opt.value,
              }))}
              allowClear
              maxTagCount={4}
              maxTagPlaceholder={(omitted) => `+${omitted.length}`}
              style={{ width: '100%' }}
            />
          </div>
        </TimeFilterRow>

        {selectedTimeSlots.length > 0 && (
          <Text type='warning' style={{ fontSize: '11px', lineHeight: 1.4 }}>
            {t('simpleFilter.timeFilter.activeCount', {
              count: selectedTimeSlots.length,
            })}
          </Text>
        )}

        <Divider
          orientation='start'
          style={{ margin: '4px 0', fontSize: '12px' }}
        >
          <Space size={4}>
            <FilterOutlined style={{ color: 'var(--ant-color-primary)' }} />
            <span>{t('simpleFilter.conditionFilter.title')}</span>
          </Space>
        </Divider>
        <Text
          type='secondary'
          style={{ fontSize: '11px', marginBottom: '4px', lineHeight: 1.4 }}
        >
          {t('simpleFilter.description')}
        </Text>

        {SIMPLE_FILTER_FIELDS.map((fieldDef, index) => {
          const rowState = rowStates[index];
          if (!rowState) return null;
          const fieldOpts = getFieldOptionsByField(fieldDef.field);
          const fieldLabel = t(
            `simpleFilter.fields.${fieldDef.labelKey}` as TranslationKey,
          );

          return (
            <FilterRow key={fieldDef.field} $enabled={rowState.enabled}>
              {/* Field Label */}
              <FieldLabel>{fieldLabel}</FieldLabel>

              {/* Include/Exclude Toggle */}
              <Tooltip
                title={
                  rowState.type === 'include'
                    ? t('simpleFilter.include')
                    : t('simpleFilter.exclude')
                }
              >
                <Button
                  size='small'
                  type={rowState.type === 'exclude' ? 'primary' : 'default'}
                  danger={rowState.type === 'exclude'}
                  onClick={() => handleToggleType(index)}
                  style={{
                    fontSize: '11px',
                    padding: '0 6px',
                    minWidth: '36px',
                    height: '24px',
                  }}
                >
                  {rowState.type === 'include'
                    ? t('simpleFilter.include')
                    : t('simpleFilter.exclude')}
                </Button>
              </Tooltip>

              {/* Value Input */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Select
                  size='small'
                  mode={fieldDef.inputType === 'tags' ? 'tags' : 'multiple'}
                  placeholder={
                    fieldDef.inputType === 'tags'
                      ? t('simpleFilter.searchPlaceholder', {
                          label: fieldLabel,
                        })
                      : t('simpleFilter.disabledPlaceholder', {
                          count: fieldOpts?.options.length || 0,
                        })
                  }
                  value={Array.isArray(rowState.value) ? rowState.value : []}
                  onChange={(values: string[]) =>
                    handleRowUpdate(index, { value: values })
                  }
                  options={fieldOpts?.options.map((opt) => ({
                    key: opt.label,
                    label: opt.label,
                    value: opt.value,
                  }))}
                  showSearch
                  optionFilterProp='label'
                  allowClear
                  maxTagCount={1}
                  maxTagPlaceholder={(omitted) => `+${omitted.length}`}
                  style={{ width: '100%' }}
                  notFoundContent={
                    fieldDef.inputType === 'tags'
                      ? null
                      : t('simpleFilter.noMatch')
                  }
                />
              </div>

              {/* Enable/Disable Switch */}
              <Switch
                size='small'
                checked={rowState.enabled}
                onChange={(checked) => handleToggleEnabled(index, checked)}
              />
            </FilterRow>
          );
        })}
      </Flex>
    </StyledDrawer>
  );
};

export default SimpleFilterDrawer;
