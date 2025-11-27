import React from "react";

/**
 * Finds the first component of the given type in the children.
 */
export function findComponent<T>(
  children: React.ReactNode,
  component: React.ComponentType<T>,
  recursive = true
) {
  const components: React.ReactElement<T>[] = [];
  React.Children.forEach(children, (child) => {
    if (Array.isArray(child) && recursive) {
      components.push(...(findComponent(child, component, recursive) || []));
    } else if (React.isValidElement(child) && child.type === component) {
      components.push(child as React.ReactElement<T>);
    }
  });

  if (components.length > 0) {
    return components;
  }

  return null;
}
