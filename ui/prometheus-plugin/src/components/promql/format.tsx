// Copyright 2024 The Perses Authors
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

// Forked from https://github.com/prometheus/prometheus/blob/65f610353919b1c7b42d3776c3a95b68046a6bba/web/ui/mantine-ui/src/promql/format.tsx

import React, { ReactElement, ReactNode } from 'react';
import { styled } from '@mui/material';
import ASTNode, {
  VectorSelector,
  matchType,
  vectorMatchCardinality,
  nodeType,
  StartOrEnd,
  MatrixSelector,
} from './ast';
import { maybeParenthesizeBinopChild, escapeString } from './utils';
import { formatPrometheusDuration } from './formatTime';

const PromqlCode = styled('span')(() => ({
  fontFamily: '"DejaVu Sans Mono", monospace',
}));

const PromqlKeyword = styled('span')(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#14bfad' : '#008080',
}));

const PromqlLabelName = styled('span')(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#ff8585' : '#800000',
}));

const PromqlString = styled('span')(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fca5a5' : '#a31515',
}));

const PromqlEllipsis = styled('span')(() => ({
  color: '#aaaaaa', // Same color for both modes as in the original CSS
}));

const PromqlDuration = styled('span')(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#22c55e' : '#09885a',
}));

const PromqlNumber = styled('span')(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#22c55e' : '#09885a',
}));

export const labelNameList = (labels: string[]): React.ReactNode[] => {
  return labels.map((l, i) => {
    return (
      <span key={i}>
        {i !== 0 && ', '}
        <span className="promql-code promql-label-name">{l}</span>
      </span>
    );
  });
};

const formatAtAndOffset = (timestamp: number | null, startOrEnd: StartOrEnd, offset: number): ReactNode => (
  <>
    {timestamp !== null ? (
      <>
        {' '}
        <span>@</span> <PromqlNumber>{(timestamp / 1000).toFixed(3)}</PromqlNumber>
      </>
    ) : startOrEnd !== null ? (
      <>
        {' '}
        <span>@</span> <PromqlKeyword>{startOrEnd}</PromqlKeyword>
        <span>(</span>
        <span>)</span>
      </>
    ) : (
      <></>
    )}
    {offset === 0 ? (
      <></>
    ) : offset > 0 ? (
      <>
        {' '}
        <PromqlKeyword>offset</PromqlKeyword> <PromqlDuration>{formatPrometheusDuration(offset)}</PromqlDuration>
      </>
    ) : (
      <>
        {' '}
        <PromqlKeyword>offset</PromqlKeyword> <PromqlDuration>-{formatPrometheusDuration(-offset)}</PromqlDuration>
      </>
    )}
  </>
);

const formatSelector = (node: VectorSelector | MatrixSelector): ReactElement => {
  const matchLabels = node.matchers
    .filter((m) => !(m.name === '__name__' && m.type === matchType.equal && m.value === node.name))
    .map((m, i) => (
      <span key={i}>
        {i !== 0 && ','}
        <PromqlLabelName>{m.name}</PromqlLabelName>
        {m.type}
        <PromqlString>&quot;{escapeString(m.value)}&quot;</PromqlString>
      </span>
    ));

  return (
    <>
      <span>{node.name}</span>
      {matchLabels.length > 0 && (
        <>
          {'{'}
          <span>{matchLabels}</span>
          {'}'}
        </>
      )}
      {node.type === nodeType.matrixSelector && (
        <>
          [<PromqlDuration>{formatPrometheusDuration(node.range)}</PromqlDuration>]
        </>
      )}
      {formatAtAndOffset(node.timestamp, node.startOrEnd, node.offset)}
    </>
  );
};

const ellipsis = <PromqlEllipsis>…</PromqlEllipsis>;

const formatNodeInternal = (node: ASTNode, showChildren: boolean, maxDepth?: number): React.ReactNode => {
  if (maxDepth === 0) {
    return ellipsis;
  }

  const childMaxDepth = maxDepth === undefined ? undefined : maxDepth - 1;

  switch (node.type) {
    case nodeType.aggregation:
      return (
        <>
          <PromqlKeyword>{node.op}</PromqlKeyword>
          {node.without ? (
            <>
              {' '}
              <PromqlKeyword>without</PromqlKeyword>
              <span>(</span>
              {labelNameList(node.grouping)}
              <span>)</span>{' '}
            </>
          ) : (
            node.grouping.length > 0 && (
              <>
                {' '}
                <PromqlKeyword>by</PromqlKeyword>
                <span>(</span>
                {labelNameList(node.grouping)}
                <span>)</span>{' '}
              </>
            )
          )}
          {showChildren && (
            <>
              <span>(</span>
              {node.param !== null && <>{formatNode(node.param, showChildren, childMaxDepth)}, </>}
              {formatNode(node.expr, showChildren, childMaxDepth)}
              <span>)</span>
            </>
          )}
        </>
      );
    case nodeType.subquery:
      return (
        <>
          {showChildren && formatNode(node.expr, showChildren, childMaxDepth)}[
          <PromqlDuration>{formatPrometheusDuration(node.range)}</PromqlDuration>:
          {node.step !== 0 && <PromqlDuration>{formatPrometheusDuration(node.step)}</PromqlDuration>}]
          {formatAtAndOffset(node.timestamp, node.startOrEnd, node.offset)}
        </>
      );
    case nodeType.parenExpr:
      return (
        <>
          <span>(</span>
          {showChildren && formatNode(node.expr, showChildren, childMaxDepth)}
          <span>)</span>
        </>
      );
    case nodeType.call: {
      const children =
        childMaxDepth === undefined || childMaxDepth > 0
          ? node.args.map((arg, i) => (
              <span key={i}>
                {i !== 0 && ', '}
                {formatNode(arg, showChildren)}
              </span>
            ))
          : node.args.length > 0
            ? ellipsis
            : '';

      return (
        <>
          <PromqlKeyword>{node.func.name}</PromqlKeyword>
          {showChildren && (
            <>
              <span>(</span>
              {children}
              <span>)</span>
            </>
          )}
        </>
      );
    }
    case nodeType.matrixSelector:
      return formatSelector(node);
    case nodeType.vectorSelector:
      return formatSelector(node);
    case nodeType.numberLiteral:
      return <PromqlNumber>{node.val}</PromqlNumber>;
    case nodeType.stringLiteral:
      return <PromqlString>&quot;{escapeString(node.val)}&quot;</PromqlString>;
    case nodeType.unaryExpr:
      return (
        <>
          <span>{node.op}</span>
          {showChildren && formatNode(node.expr, showChildren, childMaxDepth)}
        </>
      );
    case nodeType.binaryExpr: {
      let matching = <></>;
      let grouping = <></>;
      const vm = node.matching;
      if (vm !== null && (vm.labels.length > 0 || vm.on)) {
        if (vm.on) {
          matching = (
            <>
              {' '}
              <PromqlKeyword>on</PromqlKeyword>
              <span>(</span>
              {labelNameList(vm.labels)}
              <span>)</span>
            </>
          );
        } else {
          matching = (
            <>
              {' '}
              <PromqlKeyword>ignoring</PromqlKeyword>
              <span>(</span>
              {labelNameList(vm.labels)}
              <span>)</span>
            </>
          );
        }

        if (vm.card === vectorMatchCardinality.manyToOne || vm.card === vectorMatchCardinality.oneToMany) {
          grouping = (
            <>
              <PromqlKeyword>
                {' '}
                group_
                {vm.card === vectorMatchCardinality.manyToOne ? 'left' : 'right'}
              </PromqlKeyword>
              <span>(</span>
              {labelNameList(vm.include)}
              <span>)</span>
            </>
          );
        }
      }

      return (
        <>
          {showChildren && formatNode(maybeParenthesizeBinopChild(node.op, node.lhs), showChildren, childMaxDepth)}{' '}
          {['atan2', 'and', 'or', 'unless'].includes(node.op) ? (
            <PromqlKeyword>{node.op}</PromqlKeyword>
          ) : (
            <span>{node.op}</span>
          )}
          {node.bool && (
            <>
              {' '}
              <PromqlKeyword>bool</PromqlKeyword>
            </>
          )}
          {matching}
          {grouping}{' '}
          {showChildren && formatNode(maybeParenthesizeBinopChild(node.op, node.rhs), showChildren, childMaxDepth)}
        </>
      );
    }
    case nodeType.placeholder:
      // TODO: Include possible children of placeholders somehow?
      return ellipsis;
    default:
      throw new Error('unsupported node type');
  }
};

export const formatNode = (node: ASTNode, showChildren: boolean, maxDepth?: number): React.ReactElement => (
  <PromqlCode>{formatNodeInternal(node, showChildren, maxDepth)}</PromqlCode>
);
