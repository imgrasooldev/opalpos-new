/**
 * Business + locations API service.
 *
 * Business hamesha token se aati hai — is liye koi `businessId` param nahi.
 */

import { api } from "@/lib/api";
import type {
  Business,
  BusinessUpdateInput,
  Location,
  LocationCreateInput,
  LocationUpdateInput,
} from "@/types/business";

const BASE = "/business";

export function getBusiness(): Promise<Business> {
  return api.get<Business>(BASE);
}

export function updateBusiness(input: BusinessUpdateInput): Promise<Business> {
  return api.patch<Business>(BASE, input);
}

export function listLocations(): Promise<Location[]> {
  return api.get<Location[]>(`${BASE}/locations`);
}

export function createLocation(input: LocationCreateInput): Promise<Location> {
  return api.post<Location>(`${BASE}/locations`, input);
}

export function updateLocation(
  id: number,
  input: LocationUpdateInput,
): Promise<Location> {
  return api.patch<Location>(`${BASE}/locations/${id}`, input);
}
