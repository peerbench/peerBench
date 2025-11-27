"use client";

import {
  createContext,
  useContext,
  ReactNode,
  SetStateAction,
  Dispatch,
  useState,
} from "react";
import {
  useForm,
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { PromptSetLicenses, UserRoleOnPromptSet } from "@/database/types";

// Form validation schema
const promptSetSchema = yup.object({
  title: yup.string().required("Title is required"),
  description: yup.string().optional().default(""),
  citationInfo: yup.string().optional().default(""),
  category: yup.string().nullable().default(""),
  tags: yup.array().of(yup.string().required()).optional().default([]),
  isPublic: yup.boolean().default(false),
  isPublicSubmissionsAllowed: yup.boolean().default(false),
  license: yup
    .string()
    .oneOf(Object.values(PromptSetLicenses))
    .required("License is required"),
});

export type PromptSetFormData = yup.InferType<typeof promptSetSchema>;

export interface Collaborator {
  id: string;
  email: string;
  role: UserRoleOnPromptSet;
}

export type ComponentContextType = {
  register: UseFormRegister<PromptSetFormData>;
  watch: UseFormWatch<PromptSetFormData>;
  setValue: UseFormSetValue<PromptSetFormData>;
  errors: FieldErrors<PromptSetFormData>;
  handleSubmit: (
    onSubmit: (data: PromptSetFormData) => void
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
};

const ComponentContext = createContext<ComponentContextType | null>(null);

export function ComponentContextProvider({
  children,
  defaultValues,
}: {
  children: ReactNode;
  defaultValues?: PromptSetFormData;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PromptSetFormData>({
    resolver: yupResolver(promptSetSchema),
    defaultValues: defaultValues ?? {
      title: "",
      description: "",
      citationInfo: "",
      category: null,
      tags: [],
      isPublic: false,
      isPublicSubmissionsAllowed: false,
      license: PromptSetLicenses.ccBy40,
    },
  });

  return (
    <ComponentContext.Provider
      value={{
        register,
        watch,
        setValue,
        errors,
        handleSubmit,
        isSubmitting,
        setIsSubmitting,
      }}
    >
      {children}
    </ComponentContext.Provider>
  );
}

export function useComponentContext() {
  const context = useContext(ComponentContext);
  if (!context) {
    throw new Error(
      "useComponentContext must be used inside ComponentContextProvider"
    );
  }
  return context;
}
