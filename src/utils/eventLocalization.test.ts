import { describe, expect, it } from "vitest";
import {
  decodeEventTitleEntities,
  getEventTypeLabel,
  localizeEventTitle,
} from "./eventLocalization";

describe("event type localization", () => {
  it.each([
    ["raid-hour", "レイドアワー"],
    ["pokemon-spotlight-hour", "スポットライトアワー"],
    ["community-day", "コミュニティ・デイ"],
    ["timed-research", "タイムチャレンジ"],
    ["go-rocket-takeover", "GOロケット団占拠"],
  ])("maps %s to %s", (eventType, expected) => {
    expect(getEventTypeLabel(eventType)).toBe(expected);
  });

  it("uses その他 for null and future event types", () => {
    expect(getEventTypeLabel(null)).toBe("その他");
    expect(getEventTypeLabel("future-event-type")).toBe("その他");
  });
});

describe("event title localization", () => {
  it.each([
    ["Lunala Raid Hour", "ルナアーラのレイドアワー"],
    ["Magikarp Spotlight Hour", "コイキングのスポットライトアワー"],
    ["Nickit Community Day", "クスネのコミュニティ・デイ"],
    [
      "Mega Garchomp in Mega Raids",
      "メガガブリアスが登場するメガレイド",
    ],
    [
      "Regirock, Regice, and Registeel Raid Hour",
      "レジロック、レジアイス、レジスチルのレイドアワー",
    ],
    [
      "Shadow Giratina (Altered Forme) in Shadow Raids",
      "シャドウギラティナ（アナザーフォルム）が登場するシャドウレイド",
    ],
  ])("localizes %s", (title, expected) => {
    expect(localizeEventTitle(title)).toBe(expected);
  });

  it("uses verified Japanese titles for recurring named events", () => {
    expect(localizeEventTitle("Ultra Unlock: Water Festival")).toBe(
      "ウルトラアンロック：ウォーターフェスティバル",
    );
    expect(localizeEventTitle("Pokémon GO Fest 2026: Mega Finale")).toBe(
      "ポケモン GO Fest 2026：メガフィナーレ",
    );
  });

  it("localizes known GO Battle League terms without changing internal IDs", () => {
    expect(
      localizeEventTitle(
        "Master League and Evolution Cup: Great League Edition | Forever Forward",
      ),
    ).toBe(
      "マスターリーグと進化カップ：スーパーリーグバージョン｜新たな歩み",
    );
  });

  it("handles capitalization differences in recurring event phrases", () => {
    expect(localizeEventTitle("Adventure week")).toBe(
      "アドベンチャーウィーク",
    );
  });

  it("decodes HTML entities but keeps unverified proper titles in English", () => {
    expect(decodeEventTitleEntities("PokémonXP &amp; 2026 Worlds")).toBe(
      "PokémonXP & 2026 Worlds",
    );
    expect(localizeEventTitle("Unverified Brand Celebration")).toBe(
      "Unverified Brand Celebration",
    );
  });

  it("handles missing titles safely", () => {
    expect(localizeEventTitle(null)).toBe("名称未設定のイベント");
    expect(localizeEventTitle("   ")).toBe("名称未設定のイベント");
  });
});
