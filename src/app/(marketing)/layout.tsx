import "./marketing.css";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="marketing-page">{children}</div>;
}
