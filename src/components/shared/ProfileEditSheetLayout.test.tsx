import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileEditSheetLayout } from "./ProfileEditSheetLayout";

vi.mock("@/components/business/ImageUpload", () => ({ default: () => <div data-testid="profile-image" /> }));

describe("ProfileEditSheetLayout", () => {
  it("uses the shared planner layout and exposes unsaved state", () => {
    render(<ProfileEditSheetLayout open onRequestOpenChange={vi.fn()} description="Profilbeskrivelse" fieldHint="Hjælpetekst" uploadFolder="profile" avatarUrl="" onAvatarChange={vi.fn()} name="Test" onNameChange={vi.fn()} saving={false} dirty onCancel={vi.fn()} onSave={vi.fn()} saveContent="Gem profil" />);
    expect(screen.getByRole("dialog")).toHaveClass("planner-overlay");
    expect(screen.getByText("Ikke gemt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gem profil" })).toBeEnabled();
    expect(screen.getByLabelText(/Navn/)).toHaveClass("h-11");
  });
});