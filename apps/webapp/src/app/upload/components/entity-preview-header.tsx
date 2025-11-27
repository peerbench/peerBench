"use client";

import { LucideUpload, LucideEye } from "lucide-react";
import {
  usePageContext,
  PromptState,
  PromptResponseState,
  EntityState,
  EntityType,
  PromptScoreState,
} from "../context";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";
import { EntityProcessStatus } from "./entity-process-status";
import { Dispatch, SetStateAction } from "react";

interface EntityPreviewHeaderProps {
  item: EntityState;
  entityType: EntityType;
  isLoadingStatuses: boolean;
}

export function EntityPreviewHeader({
  item,
  entityType,
  isLoadingStatuses,
}: EntityPreviewHeaderProps) {
  const ctx = usePageContext();
  const isRevealed = item.isRevealed;
  const isRegistered = item.isRegistered;
  const revealed = isRevealed === true;
  const registered = isRegistered === true;

  // Get the setter function based on entity type
  const setState = (
    entityType === "prompts"
      ? ctx.setPrompts
      : entityType === "responses"
        ? ctx.setResponses
        : ctx.setScores
  ) as Dispatch<SetStateAction<EntityState[]>>;

  // Get the prefix for HTML IDs
  const idPrefix =
    entityType === "prompts"
      ? "prompt"
      : entityType === "responses"
        ? "response"
        : "score";

  // Helper function to get ID from an entity
  const getEntityId = (entity: EntityState) =>
    entityType === "prompts"
      ? (entity as PromptState).promptUUID
      : entityType === "responses"
        ? (entity as PromptResponseState).responseUUID
        : (entity as PromptScoreState).scoreUUID;

  const handleRevealChange = (checked: boolean) => {
    setState((prev: EntityState[]) =>
      prev.map((entity) => {
        if (getEntityId(entity) !== getEntityId(item)) {
          return entity;
        }

        return {
          ...entity,
          reveal: checked === true,
          upload:
            entity.upload !== true && checked === true ? true : entity.upload,
        };
      })
    );
  };

  const handleUploadChange = (checked: boolean) => {
    setState((prev: EntityState[]) =>
      prev.map((entity) => {
        if (getEntityId(entity) !== getEntityId(item)) {
          return entity;
        }

        return {
          ...entity,
          upload: checked === true,
          reveal: checked !== true ? false : entity.reveal,
        };
      })
    );
  };

  return (
    <div className="flex items-center w-full justify-between gap-2 mb-3">
      <EntityProcessStatus
        isRevealed={entityType === "scores" ? true : isRevealed}
        isRegistered={isRegistered}
      />

      <div className="flex flex-row-reverse items-center gap-4">
        {entityType === "scores" ? null : (
          <>
            {/* Reveal Checkbox */}
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`${idPrefix}-${getEntityId(item)}-reveal`}
                className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
              >
                <LucideEye className="w-4 h-4" />
                Reveal
              </Label>
              {revealed ? (
                <Checkbox
                  id={`${idPrefix}-${getEntityId(item)}-reveal`}
                  checked
                  disabled
                />
              ) : (
                <Checkbox
                  id={`${idPrefix}-${getEntityId(item)}-reveal`}
                  checked={item.reveal}
                  onCheckedChange={handleRevealChange}
                  disabled={item.isRevealed === true || isLoadingStatuses}
                />
              )}
            </div>
          </>
        )}

        {/* Upload Checkbox */}
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`${idPrefix}-${getEntityId(item)}-upload`}
            className={cn({
              "opacity-50 cursor-not-allowed": item.isRegistered === true,
            })}
          >
            <LucideUpload className="w-4 h-4" />
            Upload
          </Label>
          {registered ? (
            <Checkbox
              id={`${idPrefix}-${getEntityId(item)}-upload`}
              checked
              disabled
            />
          ) : (
            <Checkbox
              id={`${idPrefix}-${getEntityId(item)}-upload`}
              checked={item.upload}
              onCheckedChange={handleUploadChange}
              disabled={item.isRegistered === true || isLoadingStatuses}
            />
          )}
        </div>
      </div>
    </div>
  );
}
