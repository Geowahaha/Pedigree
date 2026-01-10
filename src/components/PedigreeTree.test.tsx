import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PedigreeTree from "@/components/PedigreeTree";

describe("PedigreeTree", () => {
  it("does not throw when onPetClick is omitted", () => {
    const pet = {
      id: "pet-1",
      name: "Rex",
      breed: "Golden Retriever",
      gender: "male",
      type: "dog",
      image: "/placeholder-pet.png",
    };

    render(<PedigreeTree pet={pet} />);

    const petButton = screen.getByRole("button", { name: /rex/i });
    expect(() => fireEvent.click(petButton)).not.toThrow();
  });
});
