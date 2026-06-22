import { ShieldOff } from "lucide-react";

export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#3f4147] bg-[#383a40]">
        <ShieldOff className="h-6 w-6 text-[#b5bac1]" />
      </div>
      <div>
        <p className="text-base font-semibold text-[#f2f3f5]">アクセス権限がありません</p>
        <p className="mt-1 text-sm text-[#b5bac1]">
          このページを表示するには管理者以上の権限が必要です。
        </p>
      </div>
    </div>
  );
}
