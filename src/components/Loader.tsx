export function SkeletonBox({id = "", className = ""}: {id?: string, className?: string})
{
  return (
    <div id={id} className={"skeleton-box " + className}>
      <div className="skeleton-shimmer"/>
    </div>
  );
}

export function LoaderBox({id = "", className = ""}: {id?: string, className?: string})
{
  return (
    <div id={id} className={"loader-container " + className}>
      <div className={"loader-box"} />
    </div>
  );
}