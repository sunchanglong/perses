// Copyright 2023 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { TimeSeriesValueTuple } from '@perses-dev/core';
import { LineSeriesOption } from 'echarts/charts';
import { LegendItem } from '../Legend';

// adjust display when there are many time series to help with performance
export const OPTIMIZED_MODE_SERIES_LIMIT = 1000;

export type UnixTimeMs = number;

export interface GraphSeries {
  name: string;
  values: TimeSeriesValueTuple[];
  id?: string;
}

export type EChartsValues = number | null | '-';

export interface LegacyTimeSeries extends Omit<LineSeriesOption, 'data'> {
  data: EChartsValues[];
}

export interface TimeSeries {
  id: string;
  values: TimeSeriesValueTuple[];
}

// TODO: Continue to simplify TimeChart types, fix legend and thresholds
export type TimeChartData = TimeSeries[] | null;
export type TimeChartSeriesMapping = LineSeriesOption[];
export type TimeChartLegendItems = LegendItem[];

// TODO: Rename to LegacyEChartsDataFormat
export type EChartsDataFormat = {
  timeSeries: LegacyTimeSeries[];
  xAxis: number[];
  legendItems?: LegendItem[];
  xAxisMax?: number | string;
  rangeMs?: number;
};

// Intentionally making this an object to start because it is plausible we will
// want to support focusing by other attributes (e.g. index, name) in the future,
// and starting with an object will make adding them a non-breaking change.
export type ChartHandleFocusOpts = {
  id: string;
};

export type ChartHandle = {
  /**
   * Highlight the series associated with the specified options.
   */
  highlightSeries: (opts: ChartHandleFocusOpts) => void;

  /**
   * Clear all highlighted series.
   */
  clearHighlightedSeries: () => void;
};
