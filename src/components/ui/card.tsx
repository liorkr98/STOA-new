import { forwardRef, type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/design/cn";

/** The card look, for elements that cannot be a <Card> (links, motion, node views). */
export const cardClass = "bg-surface border border-border rounded-panel";

type CardProps = HTMLAttributes<HTMLElement> & {
  /** Render as another element (section, li, form, fieldset). Defaults to div. */
  as?: ElementType;
};

/** White card on the paper: hairline edge, the panel radius (14px). */
export const Card = forwardRef<HTMLElement, CardProps>(
  ({ as: Tag = "div", className, ...props }, ref) => (
    <Tag ref={ref} className={cn(cardClass, className)} {...props} />
  ),
);
Card.displayName = "Card";

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
