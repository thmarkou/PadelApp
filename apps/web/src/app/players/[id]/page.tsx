"use client";

import { useParams } from "next/navigation";
import { PlayerForm } from "../../../components/PlayerForm";

export default function EditPlayerPage() {
  const params = useParams<{ id: string }>();
  return <PlayerForm playerId={params.id} />;
}
