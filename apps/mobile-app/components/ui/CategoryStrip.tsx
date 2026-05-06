import { View, Text, ScrollView, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { ApiCategory } from "@/lib/api";

type Props = {
  categories: ApiCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
  showAll?: boolean;
};

export function CategoryStrip({
  categories,
  selectedId,
  onSelect,
  showAll = true,
}: Props) {
  const items = showAll
    ? [
        {
          id: "all",
          name: "Tümü",
          icon: "🍽️",
          image: null,
          sortOrder: -1,
          active: true,
          printToKitchen: false,
          createdAt: "",
          updatedAt: "",
        } as ApiCategory,
        ...categories,
      ]
    : categories;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
    >
      {items.map((c) => {
        const active = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(c.id);
            }}
            className={`items-center rounded-2xl px-4 py-3 ${
              active ? "bg-primary-500" : "bg-surface"
            }`}
            style={{ minWidth: 80 }}
          >
            <Text className="text-2xl">{c.icon ?? "🍽️"}</Text>
            <Text
              className={`mt-1 text-[11px] font-bold ${
                active ? "text-white" : "text-foreground"
              }`}
              numberOfLines={1}
            >
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
