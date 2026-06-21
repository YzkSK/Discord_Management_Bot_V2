export function LoadingSpinner() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3f4147] border-t-indigo-500" />
    </div>
  );
}
