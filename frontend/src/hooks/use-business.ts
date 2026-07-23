"use client";

/** Business + locations hooks. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import * as businessService from "@/lib/services/business";
import type {
  Business,
  BusinessUpdateInput,
  Location,
  LocationCreateInput,
} from "@/types/business";

export const businessKeys = {
  all: ["business"] as const,
  detail: () => [...businessKeys.all, "detail"] as const,
  locations: () => [...businessKeys.all, "locations"] as const,
};

export function useBusiness(): UseQueryResult<Business> {
  return useQuery({
    queryKey: businessKeys.detail(),
    queryFn: businessService.getBusiness,
  });
}

export function useLocations(): UseQueryResult<Location[]> {
  return useQuery({
    queryKey: businessKeys.locations(),
    queryFn: businessService.listLocations,
  });
}

export function useUpdateBusiness(): UseMutationResult<
  Business,
  Error,
  BusinessUpdateInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: businessService.updateBusiness,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.all });
    },
  });
}

export function useCreateLocation(): UseMutationResult<
  Location,
  Error,
  LocationCreateInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: businessService.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.all });
    },
  });
}
