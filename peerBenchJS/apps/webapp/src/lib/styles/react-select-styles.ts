import { StylesConfig } from "react-select";

/**
 * Main react-select styles
 */
export const reactSelectStyles: StylesConfig<any, any, any> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: "40px",
    backgroundColor: "var(--color-card)",
    borderColor: state.isFocused
      ? "var(--color-ring)"
      : state.hasValue
        ? "var(--color-border)"
        : "var(--color-input)",
    borderRadius: "var(--radius)",
    boxShadow: state.isFocused ? `0 0 0 1px var(--color-ring)` : "none",
    "&:hover": {
      borderColor: state.isFocused
        ? "var(--color-ring)"
        : "var(--color-primary-400)",
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "var(--color-muted-foreground)",
  }),
  input: (provided) => ({
    ...provided,
    color: "var(--color-foreground)",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "var(--color-foreground)",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "var(--color-muted)",
    borderRadius: "var(--radius-sm)",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "var(--color-foreground)",
    fontSize: "14px",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: "var(--color-muted-foreground)",
    borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
    "&:hover": {
      backgroundColor: "var(--color-destructive)",
      color: "var(--color-primary-foreground)",
      cursor: "pointer",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "var(--color-popover)",
    border: `1px solid var(--color-border)`,
    borderRadius: "var(--radius)",
    boxShadow:
      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  }),
  menuPortal: (provided) => ({
    ...provided,
    pointerEvents: "auto",
    zIndex: 113,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: "4px",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "var(--color-accent)"
      : state.isFocused
        ? "var(--color-muted)"
        : "transparent",
    color: state.isSelected
      ? "var(--color-accent-foreground)"
      : "var(--color-foreground)",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    margin: "2px 0",
    "&:active": {
      backgroundColor: "var(--color-accent)",
    },
    "&:hover": {
      backgroundColor: state.isSelected
        ? "var(--color-accent)"
        : "var(--color-muted)",
      cursor: "pointer",
    },
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: "var(--color-muted-foreground)",
    "&:hover": {
      color: "var(--color-foreground)",
      cursor: "pointer",
    },
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: "var(--color-muted-foreground)",
    "&:hover": {
      color: "var(--color-foreground)",
      cursor: "pointer",
    },
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    "&:hover": {
      cursor: "pointer",
    },
  }),
  loadingIndicator: (provided) => ({
    ...provided,
    color: "var(--color-muted-foreground)",
  }),
  loadingMessage: (provided) => ({
    ...provided,
    color: "var(--color-muted-foreground)",
  }),
  noOptionsMessage: (provided) => ({
    ...provided,
    color: "var(--color-muted-foreground)",
  }),
  groupHeading: (provided) => ({
    ...provided,
    color: "var(--color-muted-foreground)",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: "2px 8px",
  }),
};

/**
 * Error state styles for react-select
 */
export const reactSelectErrorStyles: StylesConfig<any, any, any> = {
  ...reactSelectStyles,
  control: (provided, state) => ({
    ...reactSelectStyles.control?.(provided, state),
    borderColor: "var(--color-destructive)",
    boxShadow: `0 0 0 1px var(--color-destructive)`,
    "&:hover": {
      borderColor: "var(--color-destructive)",
    },
  }),
};

/**
 * Disabled state styles for react-select
 */
export const reactSelectDisabledStyles: StylesConfig<any, any, any> = {
  ...reactSelectStyles,
  control: (provided, state) => ({
    ...reactSelectStyles.control?.(provided, state),
    backgroundColor: "var(--color-muted)",
    color: "var(--color-muted-foreground)",
    cursor: "not-allowed",
    "&:hover": {
      borderColor: "var(--color-border)",
    },
  }),
  multiValue: (provided, state) => ({
    ...reactSelectStyles.multiValue?.(provided, state),
    backgroundColor: "var(--color-muted)",
  }),
  multiValueLabel: (provided, state) => ({
    ...reactSelectStyles.multiValueLabel?.(provided, state),
    color: "var(--color-muted-foreground)",
  }),
  singleValue: (provided, state) => ({
    ...reactSelectStyles.singleValue?.(provided, state),
    color: "var(--color-muted-foreground)",
  }),
};
