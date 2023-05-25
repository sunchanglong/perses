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

import { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Box } from '@mui/material';
import { NearbySeriesArray } from './nearby-series';
import { SeriesInfo } from './SeriesInfo';
import { APPROX_SERIES_HEIGHT, TOOLTIP_MULTI_SERIES_MIN_WIDTH } from './tooltip-model';

export interface TooltipContentProps {
  series: NearbySeriesArray | null;
  wrapLabels?: boolean;
}

export function TooltipContent(props: TooltipContentProps) {
  const { series, wrapLabels } = props;

  const sortedFocusedSeries = useMemo(() => {
    if (series === null) return null;
    return series.sort((a, b) => (a.y > b.y ? -1 : 1));
  }, [series]);

  if (series === null || sortedFocusedSeries === null) {
    return null;
  }

  if (series.length === 1) {
    const [seriesData] = series;
    if (seriesData === undefined) {
      return null;
    }
    const { seriesName, y, formattedY, markerColor, isClosestToCursor } = seriesData;
    return (
      <SeriesInfo
        seriesName={seriesName}
        y={y}
        formattedY={formattedY}
        markerColor={markerColor}
        totalSeries={sortedFocusedSeries.length}
        wrapLabels={wrapLabels}
        emphasizeText={isClosestToCursor}
      />
    );
  }

  // TODO: is there a better way to approximate height or a dynamic height workaround for Virtuoso?
  // Need to roughly estimate height based on number of series for react-virtuoso'
  const contentHeight = Math.min(series.length * APPROX_SERIES_HEIGHT);

  return (
    <Box
      sx={{
        display: 'table',
        paddingTop: 1,
      }}
    >
      <Virtuoso
        style={{ height: contentHeight, width: TOOLTIP_MULTI_SERIES_MIN_WIDTH }}
        data={sortedFocusedSeries}
        itemContent={(index, item) => {
          return (
            <SeriesInfo
              key={item.id}
              seriesName={item.seriesName}
              y={item.y}
              formattedY={item.formattedY}
              markerColor={item.markerColor}
              totalSeries={sortedFocusedSeries.length}
              wrapLabels={wrapLabels}
              emphasizeText={item.isClosestToCursor}
            />
          );
        }}
        role="list"
      />
    </Box>
  );
}
