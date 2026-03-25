import { useMDXComponents as getThemeComponents } from "nextra-theme-docs";

type MDXComponents = Record<string, unknown>;

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...getThemeComponents(),
    ...components
  };
}
