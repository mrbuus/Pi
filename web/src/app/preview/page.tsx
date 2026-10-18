import { redirect } from "next/navigation";

// Хуучин «Номыг урьдчилан үзэх» хуудас — одоо /books (ном, сэдэв, үнэгүй тест)
export default function Page() {
  redirect("/books");
}
