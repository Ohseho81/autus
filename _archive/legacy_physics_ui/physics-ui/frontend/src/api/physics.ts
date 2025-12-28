import { httpJson } from "./client";
import type {
  PhysicsViewResponse,
  SelfcheckSubmitRequest,
  SelfcheckSubmitResponse,
} from "./viewTypes";
import type { ApplyActionRequest } from "./types";

const API_BASE = import.meta.env?.VITE_API_BASE ?? "";

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 안전한 API 호출 래퍼
 */
async function safeCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      throw new ApiError(error.message);
    }
    throw new ApiError("Unknown error occurred");
  }
}

/**
 * Single fetch for complete UI data
 */
export function getPhysicsView(): Promise<PhysicsViewResponse> {
  return safeCall(() => httpJson(`${API_BASE}/physics/view`));
}

/**
 * Apply action response type
 */
export type ApplyActionResponse = {
  ok: boolean;
  action: string;
  advanced: boolean;
  current_station: string;
  progress: number;
};

/**
 * Apply action
 */
export function applyAction(payload: ApplyActionRequest): Promise<ApplyActionResponse> {
  return safeCall(() =>
    httpJson(`${API_BASE}/action/apply`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  );
}

/**
 * Submit selfcheck (within 60s window after action)
 */
export function submitSelfcheck(payload: SelfcheckSubmitRequest): Promise<SelfcheckSubmitResponse> {
  return safeCall(() =>
    httpJson(`${API_BASE}/selfcheck/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  );
}

/**
 * Reset state to initial values
 */
export function resetState(): Promise<{ ok: boolean }> {
  return safeCall(() =>
    httpJson(`${API_BASE}/state/reset`, {
      method: "POST",
    })
  );
}
