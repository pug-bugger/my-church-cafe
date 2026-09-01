import { MenuList } from "@/components/menu/MenuList";
import { PageContainer } from "@/components/ui/page-container";

export default function MenuPage() {
  return (
    <PageContainer className="py-5 sm:p-[26px]">
      <MenuList />
    </PageContainer>
  );
}
