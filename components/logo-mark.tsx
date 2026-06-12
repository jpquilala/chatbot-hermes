import Image from "next/image";

type LogoMarkProps = {
  size?: "sm" | "md" | "lg";
  centered?: boolean;
};

const sizes = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24"
};

export function LogoMark({ size = "md", centered = false }: LogoMarkProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-full border border-court-gold/45 bg-black shadow-gold",
        sizes[size],
        centered ? "mx-auto" : ""
      ].join(" ")}
    >
      <Image
        src="/eaba-logo.png"
        alt="EABA 40+ 4th Conference badge"
        fill
        className="object-cover"
        sizes={size === "lg" ? "96px" : size === "md" ? "64px" : "40px"}
        priority={size === "lg"}
      />
    </div>
  );
}
