import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AIChatOverlay } from "@/components/ai/AIChatOverlay";
import { askPetDegreeAI } from "@/lib/gemini";
import type { Pet } from "@/lib/database";

function createBuilder() {
  let expectSingle = false;
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    not: () => builder,
    gt: () => builder,
    limit: () => builder,
    or: () => builder,
    order: () => builder,
    maybeSingle: () => {
      expectSingle = true;
      return builder;
    },
    single: () => {
      expectSingle = true;
      return builder;
    },
    then: (resolve: (value: any) => void, reject?: (reason?: any) => void) =>
      Promise.resolve({ data: expectSingle ? null : [], error: null }).then(resolve, reject),
  };
  return builder;
}

function createSupabaseMock() {
  return {
    from: () => createBuilder(),
  };
}

vi.mock("@/lib/supabase", () => ({
  supabase: createSupabaseMock(),
}));

vi.mock("@/lib/gemini", () => ({
  askPetDegreeAI: vi.fn().mockResolvedValue("ok"),
}));

describe("AIChatOverlay", () => {
  it("passes context and message to askPetDegreeAI", async () => {
    const pet: Pet = {
      id: "pet-1",
      owner_id: "owner-1",
      name: "Rex",
      type: "dog",
      breed: "Golden Retriever",
      gender: "male",
      birth_date: "2022-01-01",
      color: "gold",
      registration_number: "GR-1",
      health_certified: true,
      location: "Bangkok",
      image_url: "",
      description: "",
      is_public: true,
      created_at: "",
      updated_at: "",
      mother_id: null,
      father_id: null,
    };

    render(
      <AIChatOverlay
        isOpen={true}
        onClose={() => {}}
        initialQuery="help breeding plan"
        currentPet={pet}
      />
    );

    await waitFor(() => {
      expect(vi.mocked(askPetDegreeAI)).toHaveBeenCalledWith(
        expect.objectContaining({ pet: expect.objectContaining({ id: "pet-1" }) }),
        [],
        "help breeding plan"
      );
    });
  });
});
