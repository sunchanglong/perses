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

import { DashboardResource, ProjectResource } from '@perses-dev/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import buildURL from './url-builder';
import { HTTPHeader, HTTPMethodDELETE, HTTPMethodGET, HTTPMethodPOST, HTTPMethodPUT } from './http';
import { getDashboards, resource as dashboardResource } from './dashboard-client';
import { resource as variableResource } from './variable-client';
import { resource as datasourceResource } from './datasource-client';
import buildQueryKey from './querykey-builder';
import { fetch, fetchJson } from './fetch';
import { userKey } from './user-client';

const resource = 'projects';

/**
 * List the resources that are under project, to invalidate their cache on project deletion.
 */
const dependingResources = [dashboardResource, variableResource, datasourceResource];

export interface ProjectWithDashboards {
  project: ProjectResource;
  dashboards: DashboardResource[];
}

function createProject(entity: ProjectResource) {
  const url = buildURL({ resource });
  return fetchJson<ProjectResource>(url, {
    method: HTTPMethodPOST,
    headers: HTTPHeader,
    body: JSON.stringify(entity),
  });
}

export function getProject(name: string) {
  const url = buildURL({ resource, name });
  return fetchJson<ProjectResource>(url, {
    method: HTTPMethodGET,
    headers: HTTPHeader,
  });
}

export function getProjects() {
  const url = buildURL({ resource });
  return fetchJson<ProjectResource[]>(url, {
    method: HTTPMethodGET,
    headers: HTTPHeader,
  });
}

function updateProject(entity: ProjectResource) {
  const name = entity.metadata.name;
  const url = buildURL({ resource, name });
  return fetchJson<ProjectResource>(url, {
    method: HTTPMethodPUT,
    headers: HTTPHeader,
    body: JSON.stringify(entity),
  });
}

function deleteProject(entity: ProjectResource) {
  const name = entity.metadata.name;
  const url = buildURL({ resource, name });
  return fetch(url, {
    method: HTTPMethodDELETE,
    headers: HTTPHeader,
  });
}

/**
 * Used to get a project from the API.
 * Will automatically be refreshed when cache is invalidated
 */
export function useProject(name: string) {
  return useQuery<ProjectResource, Error>({
    queryKey: [resource, name],
    queryFn: () => {
      return getProject(name);
    },
  });
}

/**
 * Used to get projects from the API
 * Will automatically be refreshed when cache is invalidated
 */
export function useProjectList() {
  const queryKey = buildQueryKey({ resource });

  return useQuery<ProjectResource[], Error>({
    queryKey,
    queryFn: () => {
      return getProjects();
    },
  });
}

/**
 * Returns a mutation that can be used to create a project.
 * Will automatically refresh the cache for all the list.
 */
export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  const queryKey = buildQueryKey({ resource });

  return useMutation<ProjectResource, Error, ProjectResource>({
    mutationKey: queryKey,
    mutationFn: (project: ProjectResource) => {
      return createProject(project);
    },
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: [...queryKey] }),
        queryClient.invalidateQueries({ queryKey: [userKey] }),
      ]);
    },
  });
}

/**
 * Returns a mutation that can be used to update a project.
 * Will automatically refresh the cache for all the list.
 */
export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();
  const queryKey = buildQueryKey({ resource });
  return useMutation<ProjectResource, Error, ProjectResource>({
    mutationKey: queryKey,
    mutationFn: (project: ProjectResource) => {
      return updateProject(project);
    },
    onSuccess: (entity: ProjectResource) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: [...queryKey, entity.metadata.name] }),
        queryClient.invalidateQueries({ queryKey }),
      ]);
    },
  });
}

/**
 * Used to remove a project from the API
 *
 * Will automatically invalidate the project list and force get query to be executed again.
 *
 * @example:
 * const deleteProjectMutation = useDeleteProjectMutation()
 * // ...
 * deleteProjectMutation.mutate("MyProjectName")
 */
export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  const queryKey = buildQueryKey({ resource });

  return useMutation<ProjectResource, Error, ProjectResource>({
    mutationKey: queryKey,
    mutationFn: async (entity: ProjectResource) => {
      await deleteProject(entity);
      return entity;
    },
    onSuccess: (entity: ProjectResource) => {
      queryClient.removeQueries({ queryKey: [...queryKey, entity.metadata.name] });

      const dependingKeys = dependingResources.map((resource) => buildQueryKey({ resource }));
      dependingKeys.forEach((k) => queryClient.removeQueries({ queryKey: [...k, entity.metadata.name] }));

      return Promise.all([
        ...dependingKeys.map((k) => queryClient.invalidateQueries({ queryKey: k })),
        queryClient.invalidateQueries({ queryKey: [userKey] }),
        queryClient.invalidateQueries({ queryKey }),
      ]);
    },
  });
}

async function getProjectsWithDashboard(): Promise<ProjectWithDashboards[]> {
  const projects = await getProjects();
  const dashboards = await getDashboards(undefined, true);
  const dashboardList: Record<string, DashboardResource[]> = {};

  for (const dashboard of dashboards) {
    const list = dashboardList[dashboard.metadata.project] ?? [];
    list.push(dashboard);
    dashboardList[dashboard.metadata.project] = list;
  }

  const result: ProjectWithDashboards[] = [];
  for (const project of projects ?? []) {
    const list = dashboardList[project.metadata.name] ?? [];
    result.push({ project: project, dashboards: list });
  }
  return result;
}

export function useProjectsWithDashboards() {
  // We use a custom query key to avoid having the same key as a project name
  // and still have reinvalidation when a project is modified
  const queryKey = buildQueryKey({ resource, name: '*custom*' });
  return useQuery<ProjectWithDashboards[], Error>({
    queryKey,
    queryFn: () => {
      return getProjectsWithDashboard();
    },
  });
}
