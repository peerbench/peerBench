"use client";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { reactSelectStyles } from "@/lib/styles/react-select-styles";
import { errorMessage } from "@/utils/error-message";
import { usePromptAPI } from "@/lib/hooks/use-prompt-api";
import { LucideLoader2 } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { SWR_GET_ASSIGNABLE_PROMPT_SETS } from "@/lib/swr/keys";
import Select from "react-select";
import useSWR from "swr";

const MAX_PROMPT_SET_COUNT = 15;

export type AssignPromptModalSelectedPromptSet = {
  id: number;
  title: string;
};

export interface AssignPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (promptSet: AssignPromptModalSelectedPromptSet) => Promise<any>;
  promptId: string;
}

export default function AssignPromptModal({
  open,
  onOpenChange,
  onSubmit,
  promptId,
}: AssignPromptModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptSetToBeAssigned, setPromptSetToBeAssigned] =
    useState<AssignPromptModalSelectedPromptSet | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const { getAssignablePromptSets } = usePromptAPI();
  const debouncedSearchInput = useDebounce(searchInput, 300);
  const {
    data: promptSets,
    isLoading,
    mutate,
  } = useSWR(
    SWR_GET_ASSIGNABLE_PROMPT_SETS(promptId, {
      search: debouncedSearchInput || undefined,
      page: 1,
      pageSize: MAX_PROMPT_SET_COUNT,
    }),
    (params) =>
      getAssignablePromptSets(params.promptId, params.query).then(
        (r) => r.data
      ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Transform data for react-select
  const options = useMemo(() => {
    if (!promptSets) return [];

    return promptSets.map((promptSet) => ({
      id: promptSet.id,
      title: promptSet.title,
      label: `${promptSet.title} (ID: ${promptSet.id})`,
      value: promptSet.id.toString(),
    }));
  }, [promptSets]);

  const handleOnSubmit = async () => {
    if (isSubmitting || !promptSetToBeAssigned) return;

    setIsSubmitting(true);
    onSubmit(promptSetToBeAssigned)
      .then(() => {
        setPromptSetToBeAssigned(null);
        toast.success(`Prompt assigned successfully`);
        mutate(undefined, { revalidate: true });
      })
      .catch((err) => {
        console.error(err);
        toast.error(`Failed to assign Prompt: ${errorMessage(err)}`);
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleOnOpenChange = (open: boolean) => {
    if (isSubmitting) return;

    onOpenChange(open);
  };

  const handleOnPromptSetChange = (
    promptSet: AssignPromptModalSelectedPromptSet | null
  ) => {
    setPromptSetToBeAssigned(promptSet);
  };

  const handleInputChange = (inputValue: string) => {
    setSearchInput(inputValue);
  };

  const handleOnCancel = () => {
    if (isSubmitting) return;
    setPromptSetToBeAssigned(null);
    setSearchInput("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOnOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[calc(100vw-10px)] sm:m-0">
        <DialogHeader>
          <DialogTitle>Assign Prompt</DialogTitle>
          <DialogDescription>
            Select which Benchmark you want to assign this Prompt to.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Select
            isSearchable
            isClearable
            onChange={handleOnPromptSetChange}
            onInputChange={handleInputChange}
            value={promptSetToBeAssigned}
            options={options}
            styles={reactSelectStyles}
            isLoading={isLoading}
            isDisabled={isSubmitting}
            placeholder="Select a Benchmark"
            noOptionsMessage={() => "No Benchmark found"}
            loadingMessage={() => "Loading Benchmarks..."}
          />
        </div>
        <DialogFooter>
          <Button
            disabled={isSubmitting}
            variant="outline"
            onClick={handleOnCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleOnSubmit}
            disabled={!promptSetToBeAssigned || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
