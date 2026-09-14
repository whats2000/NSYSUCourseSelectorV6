import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  CourseSortingService,
  type CustomQuickFilter,
  type SortConfig,
} from '@/services';

// 精確篩選條件類型
export interface FilterCondition {
  field: string;
  type: 'include' | 'exclude';
  value: string | string[];
}

// 時間段篩選類型
export interface TimeSlotFilter {
  day: number; // 0-6 代表週一到週日
  timeSlot: string; // timeSlot key，如 '1', '2', 'A' 等
}

// State 類型定義
export interface UIState {
  selectedTabKey: string;
  hoveredCourseId: string;
  activeCourseId: string; // 手機端用於跟蹤活動課程
  activeCollapseKey: string | string[];
  displaySelectedOnly: boolean;
  displayConflictCourses: boolean;
  scrollToCourseId: string;
  searchQuery: string; // 搜尋關鍵字
  // 精確篩選相關
  advancedFilterDrawerOpen: boolean;
  filterConditions: FilterCondition[];
  // 簡易篩選模式
  simpleFilterMode: boolean;
  // 時間段篩選相關
  selectedTimeSlots: TimeSlotFilter[]; // 選中的時間段  // 自定義快速篩選器相關
  customQuickFilters: CustomQuickFilter[];
  showCustomFilterModal: boolean;
  editingCustomFilter: CustomQuickFilter | null;
  // 課程排序相關
  sortConfig: SortConfig;
  // 系所課程面板篩選相關
  departmentCourses: {
    selectedDepartments: string[];
    selectedGrades: string[];
    selectedClasses: string[];
    selectedCompulsoryTypes: string[]; // 'compulsory', 'elective', 'multipleCompulsory'
  };
}

// 初始狀態
// 從 localStorage 讀取簡易篩選模式偏好；未設定時預設為簡易模式
const loadSimpleFilterMode = (): boolean => {
  try {
    const saved = localStorage.getItem('simpleFilterMode');
    if (saved === null) return true;
    return saved !== 'false';
  } catch {
    return true;
  }
};

const initialState: UIState = {
  selectedTabKey: 'allCourses',
  hoveredCourseId: '',
  activeCourseId: '',
  activeCollapseKey: ['schedulePanel'],
  displaySelectedOnly: false,
  displayConflictCourses: true,
  scrollToCourseId: '',
  searchQuery: '',
  // 精確篩選相關
  advancedFilterDrawerOpen: false,
  filterConditions: [],
  // 簡易篩選模式
  simpleFilterMode: loadSimpleFilterMode(),
  // 時間段篩選相關
  selectedTimeSlots: [],
  // 自定義快速篩選器相關
  customQuickFilters: [],
  showCustomFilterModal: false,
  editingCustomFilter: null,
  // 課程排序相關
  sortConfig: CourseSortingService.loadSortConfig(),
  // 系所課程面板篩選相關
  departmentCourses: {
    selectedDepartments: [],
    selectedGrades: [],
    selectedClasses: [],
    selectedCompulsoryTypes: [],
  },
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedTabKey: (state, action: PayloadAction<string>) => {
      state.selectedTabKey = action.payload;
    },
    setHoveredCourseId: (state, action: PayloadAction<string>) => {
      state.hoveredCourseId = action.payload;
    },
    setActiveCourseId: (state, action: PayloadAction<string>) => {
      state.activeCourseId = action.payload;
    },
    setActiveCollapseKey: (state, action: PayloadAction<string | string[]>) => {
      state.activeCollapseKey = action.payload;
    },
    setDisplaySelectedOnly: (state, action: PayloadAction<boolean>) => {
      state.displaySelectedOnly = action.payload;
    },
    setDisplayConflictCourses: (state, action: PayloadAction<boolean>) => {
      state.displayConflictCourses = action.payload;
    },
    setScrollToCourseId: (state, action: PayloadAction<string>) => {
      state.scrollToCourseId = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    // 精確篩選相關
    setAdvancedFilterDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.advancedFilterDrawerOpen = action.payload;
    },
    addFilterCondition: (state, action: PayloadAction<FilterCondition>) => {
      state.filterConditions.push(action.payload);
    },
    removeFilterCondition: (state, action: PayloadAction<number>) => {
      state.filterConditions.splice(action.payload, 1);
    },
    updateFilterCondition: (
      state,
      action: PayloadAction<{ index: number; condition: FilterCondition }>,
    ) => {
      const { index, condition } = action.payload;
      if (index >= 0 && index < state.filterConditions.length) {
        state.filterConditions[index] = condition;
      }
    },
    clearAllFilterConditions: (state) => {
      state.filterConditions = [];
    },
    setFilterConditions: (state, action: PayloadAction<FilterCondition[]>) => {
      state.filterConditions = action.payload;
    },
    setSimpleFilterMode: (state, action: PayloadAction<boolean>) => {
      state.simpleFilterMode = action.payload;
      try {
        localStorage.setItem('simpleFilterMode', String(action.payload));
      } catch {
        // ignore
      }
    },
    // 時間段篩選相關
    addTimeSlotFilter: (state, action: PayloadAction<TimeSlotFilter>) => {
      // 檢查是否已經存在相同的時間段篩選
      const exists = state.selectedTimeSlots.some(
        (slot) =>
          slot.day === action.payload.day &&
          slot.timeSlot === action.payload.timeSlot,
      );
      if (!exists) {
        state.selectedTimeSlots.push(action.payload);
      }
    },
    removeTimeSlotFilter: (state, action: PayloadAction<TimeSlotFilter>) => {
      state.selectedTimeSlots = state.selectedTimeSlots.filter(
        (slot) =>
          !(
            slot.day === action.payload.day &&
            slot.timeSlot === action.payload.timeSlot
          ),
      );
    },
    toggleTimeSlotFilter: (state, action: PayloadAction<TimeSlotFilter>) => {
      const exists = state.selectedTimeSlots.some(
        (slot) =>
          slot.day === action.payload.day &&
          slot.timeSlot === action.payload.timeSlot,
      );
      if (exists) {
        state.selectedTimeSlots = state.selectedTimeSlots.filter(
          (slot) =>
            !(
              slot.day === action.payload.day &&
              slot.timeSlot === action.payload.timeSlot
            ),
        );
      } else {
        state.selectedTimeSlots.push(action.payload);
      }
    },
    clearAllTimeSlotFilters: (state) => {
      state.selectedTimeSlots = [];
    },
    setSelectedTimeSlots: (state, action: PayloadAction<TimeSlotFilter[]>) => {
      state.selectedTimeSlots = action.payload;
    },
    toggleDayTimeSlots: (
      state,
      action: PayloadAction<{ day: number; timeSlots: string[] }>,
    ) => {
      const { day, timeSlots } = action.payload;

      // 檢查這一天的所有時間段是否都已被選中
      const allSelected = timeSlots.every((timeSlot) =>
        state.selectedTimeSlots.some(
          (slot) => slot.day === day && slot.timeSlot === timeSlot,
        ),
      );

      if (allSelected) {
        // 如果全部選中，則取消選擇這一天的所有時間段
        state.selectedTimeSlots = state.selectedTimeSlots.filter(
          (slot) => !(slot.day === day && timeSlots.includes(slot.timeSlot)),
        );
      } else {
        // 如果沒有全部選中，則選中這一天的所有時間段
        // 先移除這一天已存在的時間段
        state.selectedTimeSlots = state.selectedTimeSlots.filter(
          (slot) => !(slot.day === day && timeSlots.includes(slot.timeSlot)),
        );
        // 然後添加這一天的所有時間段
        timeSlots.forEach((timeSlot) => {
          state.selectedTimeSlots.push({ day, timeSlot });
        });
      }
    },
    // 自定義快速篩選器相關
    setCustomQuickFilters: (
      state,
      action: PayloadAction<CustomQuickFilter[]>,
    ) => {
      state.customQuickFilters = action.payload;
    },
    addCustomQuickFilter: (state, action: PayloadAction<CustomQuickFilter>) => {
      state.customQuickFilters.push(action.payload);
    },
    removeCustomQuickFilter: (state, action: PayloadAction<string>) => {
      state.customQuickFilters = state.customQuickFilters.filter(
        (filter) => filter.id !== action.payload,
      );
    },
    updateCustomQuickFilter: (
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<CustomQuickFilter>;
      }>,
    ) => {
      const { id, updates } = action.payload;
      const index = state.customQuickFilters.findIndex(
        (filter) => filter.id === id,
      );
      if (index !== -1) {
        state.customQuickFilters[index] = {
          ...state.customQuickFilters[index],
          ...updates,
        };
      }
    },
    clearAllCustomQuickFilters: (state) => {
      state.customQuickFilters = [];
    },
    setShowCustomFilterModal: (state, action: PayloadAction<boolean>) => {
      state.showCustomFilterModal = action.payload;
    },
    setEditingCustomFilter: (
      state,
      action: PayloadAction<CustomQuickFilter | null>,
    ) => {
      state.editingCustomFilter = action.payload;
    },
    // 課程排序相關
    setSortConfig: (state, action: PayloadAction<SortConfig>) => {
      state.sortConfig = action.payload;
      CourseSortingService.saveSortConfig(action.payload);
    },
    // 系所課程面板篩選相關 reducers
    setDepartmentCoursesSelectedDepartments: (
      state,
      action: PayloadAction<string[]>,
    ) => {
      state.departmentCourses.selectedDepartments = action.payload;
    },
    setDepartmentCoursesSelectedGrades: (
      state,
      action: PayloadAction<string[]>,
    ) => {
      state.departmentCourses.selectedGrades = action.payload;
    },
    setDepartmentCoursesSelectedClasses: (
      state,
      action: PayloadAction<string[]>,
    ) => {
      state.departmentCourses.selectedClasses = action.payload;
    },
    setDepartmentCoursesSelectedCompulsoryTypes: (
      state,
      action: PayloadAction<string[]>,
    ) => {
      state.departmentCourses.selectedCompulsoryTypes = action.payload;
    },
    resetDepartmentCoursesFilters: (state) => {
      state.departmentCourses = {
        selectedDepartments: [],
        selectedGrades: [],
        selectedClasses: [],
        selectedCompulsoryTypes: [],
      };
    },
    setDepartmentCourses: (
      state,
      action: PayloadAction<UIState['departmentCourses']>,
    ) => {
      state.departmentCourses = action.payload;
    },
  },
});

export const {
  setSelectedTabKey,
  setHoveredCourseId,
  setActiveCourseId,
  setActiveCollapseKey,
  setDisplaySelectedOnly,
  setDisplayConflictCourses,
  setScrollToCourseId,
  setSearchQuery,
  setAdvancedFilterDrawerOpen,
  addFilterCondition,
  removeFilterCondition,
  updateFilterCondition,
  clearAllFilterConditions,
  setFilterConditions,
  setSimpleFilterMode,
  // 時間段篩選相關
  addTimeSlotFilter,
  removeTimeSlotFilter,
  toggleTimeSlotFilter,
  clearAllTimeSlotFilters,
  setSelectedTimeSlots,
  toggleDayTimeSlots,
  // 自定義快速篩選器相關
  setCustomQuickFilters,
  addCustomQuickFilter,
  removeCustomQuickFilter,
  updateCustomQuickFilter,
  clearAllCustomQuickFilters,
  setShowCustomFilterModal,
  setEditingCustomFilter,
  // 課程排序相關
  setSortConfig,
  // 系所課程面板篩選相關
  setDepartmentCoursesSelectedDepartments,
  setDepartmentCoursesSelectedGrades,
  setDepartmentCoursesSelectedClasses,
  setDepartmentCoursesSelectedCompulsoryTypes,
  resetDepartmentCoursesFilters,
  setDepartmentCourses,
} = uiSlice.actions;

export default uiSlice;
