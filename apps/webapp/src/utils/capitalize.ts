export function capitalize(
  str: string,
  eachWord = false,
  delimiter: RegExp | string = " "
) {
  // First, split camelCase strings by adding spaces
  str = splitCamelCase(str);

  return eachWord
    ? str
        .split(delimiter ?? /[,.\-/]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : str.charAt(0).toUpperCase() + str.slice(1);
}

function splitCamelCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1 $2");
}
