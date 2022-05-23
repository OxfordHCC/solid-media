export function getSearchParams() {
  return new URLSearchParams(document.location.search.substring(1));
}
export function getSearchParam(key) {
  return getSearchParams().get(key);
}
export function noDefault(handler) {
  return (e) => {
    e.stopPropagation();
    e.preventDefault();
    handler(e);
  };
}
