import React, { memo } from "react";

type Props = {
  width?: number | string;
  height?: number | string;
  className?: string;
};

const Skeleton: React.FC<Props> = ({ width = "100%", height = 16, className = "" }) => {
  return (
    <div
      className={`animate-pulse bg-gray-700/60 rounded ${className}`}
      style={{ width, height }}
    />
  );
};

export default memo(Skeleton);

