import { describe, expect, it } from "vitest";
import type { Objective } from "../../types";
import {
  getPrivateObjectiveIds,
  isBudgetItemPrivate,
  isTaskPrivate,
} from "../visibility";

const SHARED_OBJECTIVE: Objective = {
  id: "shared1",
  title: "Objectif partagé",
  status: "active",
  createdBy: "u1",
  createdAt: 0,
};

const PRIVATE_OBJECTIVE: Objective = {
  ...SHARED_OBJECTIVE,
  id: "priv1",
  visibility: "private",
};

describe("getPrivateObjectiveIds", () => {
  it("ne retient que les ids des objectifs privés", () => {
    const ids = getPrivateObjectiveIds([SHARED_OBJECTIVE, PRIVATE_OBJECTIVE]);
    expect(ids.has("priv1")).toBe(true);
    expect(ids.has("shared1")).toBe(false);
  });
});

describe("isTaskPrivate", () => {
  const privateIds = new Set(["priv1"]);

  it("est privée si rattachée à un objectif privé", () => {
    expect(isTaskPrivate({ objectiveId: "priv1" }, privateIds)).toBe(true);
  });

  it("est partagée si rattachée à un objectif partagé", () => {
    expect(isTaskPrivate({ objectiveId: "shared1" }, privateIds)).toBe(false);
  });

  it("est partagée si sans objectif", () => {
    expect(isTaskPrivate({ objectiveId: null }, privateIds)).toBe(false);
  });
});

describe("isBudgetItemPrivate", () => {
  const privateIds = new Set(["priv1"]);

  it("est privée si rattachée à un objectif privé", () => {
    expect(isBudgetItemPrivate({ objectiveId: "priv1" }, privateIds)).toBe(
      true,
    );
  });

  it("est partagée si sans objectif", () => {
    expect(isBudgetItemPrivate({ objectiveId: null }, privateIds)).toBe(
      false,
    );
  });
});
