import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";

const BASE = "/api";

export type ModuleSummary = {
  id: number;
  labId: number;
  title: string;
  description: string;
  type: "quiz" | "terminal" | "flag" | "code";
  orderIndex: number;
  xp: number;
};

export type ModuleFull = ModuleSummary & { content: any };

export type ModuleProgress = {
  id: number;
  userId: string;
  moduleId: number;
  status: "not_started" | "in_progress" | "completed";
  score: number | null;
  attempts: number;
  completedAt: string | null;
};

export type SubmitResult = {
  correct: boolean;
  score: number;
  explanation: string;
  xp: number;
};

async function apiFetch(path: string, token: string | null, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

export function useLabModules(labId: number) {
  return useQuery<ModuleSummary[]>({
    queryKey: ["modules", "lab", labId],
    queryFn: () => apiFetch(`/labs/${labId}/modules`, null),
    enabled: !!labId,
  });
}

export function useModule(moduleId: number) {
  return useQuery<ModuleFull>({
    queryKey: ["module", moduleId],
    queryFn: () => apiFetch(`/modules/${moduleId}`, null),
    enabled: !!moduleId,
  });
}

export function useLabProgress(labId: number) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<ModuleProgress[]>({
    queryKey: ["progress", "lab", labId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch(`/labs/${labId}/progress`, token);
    },
    enabled: !!labId && !!isSignedIn,
  });
}

export function useSubmitModule(moduleId: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SubmitResult, Error, { answer?: any; commandsCompleted?: number }>({
    mutationFn: async (body) => {
      const token = await getToken();
      return apiFetch(`/modules/${moduleId}/submit`, token, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}
