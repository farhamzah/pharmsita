import React from "react";

type Props = {
  title?: string;
  description?: string;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  bodyClassName?: string;
  headerClassName?: string;
};

const ContentWrapper: React.FC<Props> = ({
  title,
  description,
  headerRight,
  children,
  bodyClassName,
  headerClassName,
}) => {
  return (
    <div className="bg-card text-card-foreground p-2 sm:p-6 rounded-xl shadow-sm">
      {(title || description || headerRight) && (
        <div className="flex items-start justify-between mb-4">
          <div className={headerClassName}>
            {title && (
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {headerRight && <div>{headerRight}</div>}
        </div>
      )}

      <div
        className={`flex flex-col gap-4 py-0 sm:py-4 px-0 min-w-0 ${bodyClassName}`}
      >
        {children}
      </div>
    </div>
  );
};

export default ContentWrapper;
