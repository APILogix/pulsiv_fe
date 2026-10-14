import { Block } from "./primitives";

/** Auth card skeleton for public login/register/recovery pages. */
export function AuthCardSkeleton() {
  return (
    <div className="flex w-full items-center justify-center" aria-busy="true" aria-label="Loading">
      <div className="flex w-full max-w-[400px] flex-col">
        <div className="mb-8 flex flex-col gap-3">
          <Block className="h-7 w-56" />
          <Block className="h-3.5 w-64" delay={20} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Block className="h-3 w-16" delay={40} />
            <Block className="h-11 w-full" rounded="sm" delay={60} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Block className="h-3 w-20" delay={80} />
            <Block className="h-11 w-full" rounded="sm" delay={100} />
          </div>
          <Block className="h-11 w-full" rounded="sm" delay={120} />
        </div>
      </div>
    </div>
  );
}
