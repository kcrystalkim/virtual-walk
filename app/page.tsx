import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <ThemeToggle />
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">잠깐, 쉬어가요 🌿</h1>
          <p className="text-lg text-muted-foreground">일이 힘들 때 잠깐 자연 속을 걸어봐요</p>
        </div>
        <Link
          href="/walk"
          className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background rounded-full text-lg font-medium hover:opacity-80 transition-opacity"
        >
          🚶 산책하러 가기
        </Link>
      </div>
    </div>
  );
}
