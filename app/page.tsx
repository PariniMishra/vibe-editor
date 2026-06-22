import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import  UserButton  from "@/modules/auth/components/user-button";
import Image from "next/image";

export default function Home() {
  
  return (
    <>
   <Button>
    Get Started
   </Button>
   <UserButton/>
   </>
  );
}
