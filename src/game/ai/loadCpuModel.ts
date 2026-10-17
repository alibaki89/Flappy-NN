import { DqnAgent, type SerializedDqnModel } from "./dqnAgent";

export type CpuModelLoadResult =
  | {
      loaded: true;
      source: string;
    }
  | {
      loaded: false;
      reason: string;
    };

export async function loadCpuModel(agent: DqnAgent): Promise<CpuModelLoadResult> {
  try {
    const response = await fetch("/models/cpu-model.json", {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        loaded: false,
        reason: "No trained model file found at /models/cpu-model.json",
      };
    }

    const data = (await response.json()) as SerializedDqnModel;

    agent.loadModelData(data);

    return {
      loaded: true,
      source: "/models/cpu-model.json",
    };
  } catch (error) {
    return {
      loaded: false,
      reason:
        error instanceof Error
          ? error.message
          : "Unknown error while loading CPU model",
    };
  }
}
