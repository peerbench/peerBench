"use client";

import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  useComponentContext,
  PromptSetFormData,
  ComponentContextProvider,
} from "./context";
import { SelectVisibilitySection } from "./components/select-visibility-section";
import { InformationSection } from "./components/information-section";
import { errorMessage } from "@/utils/error-message";
import { LucideLoader2, PlusCircle, Save } from "lucide-react";
import { MaybePromise } from "peerbench";

export interface PromptSetInputFormProps {
  onSubmit?: (data: PromptSetFormData) => MaybePromise<void>;
  defaultValues?: PromptSetFormData;
  errorToastMessagePrefix?: string;
  children?: React.ReactNode;
  submitButtonTexts?: {
    plain: string;
    loading: string;
  };
}

function Comp(props: PromptSetInputFormProps) {
  const { handleSubmit, isSubmitting, setIsSubmitting } = useComponentContext();

  const onSubmit = async (data: PromptSetFormData) => {
    setIsSubmitting(true);
    try {
      await props.onSubmit?.(data);
    } catch (error) {
      console.error(error);
      toast.error(
        `${props.errorToastMessagePrefix || "Error:"} ${errorMessage(error)}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={onKeyDown}
      className="space-y-6"
    >
      <InformationSection />
      <SelectVisibilitySection />
      {props.children}
      <div className="flex justify-end space-x-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LucideLoader2 className="animate-spin mr-2 h-4 w-4" />
              {props.submitButtonTexts?.loading || "Loading..."}
            </>
          ) : (
            <>
              {props.submitButtonTexts?.plain === "Create" ? (
                <PlusCircle className="mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {props.submitButtonTexts?.plain || "Submit"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PromptSetInputForm({
  defaultValues,
  ...props
}: PromptSetInputFormProps) {
  return (
    <ComponentContextProvider defaultValues={defaultValues}>
      <Comp {...props} />
    </ComponentContextProvider>
  );
}
