"use client";
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useProfile } from "@/lib/react-query/use-profile";
import { OrganizationClientService } from "@/services/organization.client";
import {
  isUserAffiliatedWithOrg,
  addUserToOrg,
} from "@/services/org-people.service";
import { toast } from "react-toastify";

export type PageContextType = {
  isLoading: boolean;
  currentUser: {
    id: string;
    email: string | null;
  } | null;
  organization: {
    id: number;
    name: string;
    country?: string | null;
    alpha_two_code?: string | null;
    web_page?: string | null;
  } | null;
  isLookingUpOrg: boolean;
  isAffiliated: boolean;
  isCheckingAffiliation: boolean;
  isAddingAffiliation: boolean;
  addAffiliation: () => Promise<void>;
};

export function PageContextProvider({ children }: { children: ReactNode }) {
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string | null;
  } | null>(null);
  const [organization, setOrganization] = useState<{
    id: number;
    name: string;
    country?: string | null;
    alpha_two_code?: string | null;
    web_page?: string | null;
  } | null>(null);
  const [isLookingUpOrg, setIsLookingUpOrg] = useState(false);
  const [isAffiliated, setIsAffiliated] = useState(false);
  const [isCheckingAffiliation, setIsCheckingAffiliation] = useState(false);
  const [isAddingAffiliation, setIsAddingAffiliation] = useState(false);

  useEffect(() => {
    if (profile) {
      setCurrentUser({
        id: profile.id,
        email: profile.email,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (currentUser?.id && organization?.id) {
      checkAffiliationStatus(organization.id, currentUser.id);
    }
  }, [currentUser?.id, organization?.id]);

  useEffect(() => {
    if (profile?.email) {
      lookupOrganization(profile.email);
    }
  }, [profile?.email]);

  const checkAffiliationStatus = async (orgId: number, userId: string) => {
    setIsCheckingAffiliation(true);
    try {
      const result = await isUserAffiliatedWithOrg({ orgId, userId });
      if (result.success) {
        setIsAffiliated(result.isAffiliated || false);
      }
    } catch (error) {
      console.error("Error checking affiliation:", error);
    } finally {
      setIsCheckingAffiliation(false);
    }
  };

  const lookupOrganization = async (email: string) => {
    if (!email || !email.includes("@")) {
      setOrganization(null);
      return;
    }

    setIsLookingUpOrg(true);
    try {
      const result = await OrganizationClientService.lookupByEmail(email);

      if (result.found && result.organization) {
        setOrganization(result.organization);
      } else {
        setOrganization(null);
        setIsAffiliated(false);
      }
    } catch (error) {
      console.error("Error looking up organization:", error);
      setOrganization(null);
      setIsAffiliated(false);
    } finally {
      setIsLookingUpOrg(false);
    }
  };

  const addAffiliation = async () => {
    if (!currentUser?.id || !organization) return;

    setIsAddingAffiliation(true);
    try {
      const result = await addUserToOrg({
        orgId: organization.id,
        userId: currentUser.id,
      });

      if (result.success) {
        setIsAffiliated(true);
        toast.success("Successfully affiliated with organization!");
      } else if (result.isDuplicate) {
        toast.warning(result.error);
        setIsAffiliated(true);
      } else {
        toast.error(result.error || "Failed to add affiliation");
      }
    } catch (error) {
      console.error("Error adding affiliation:", error);
      toast.error("Failed to add affiliation");
    } finally {
      setIsAddingAffiliation(false);
    }
  };

  const value: PageContextType = {
    isLoading: isProfileLoading,
    currentUser,
    organization,
    isLookingUpOrg,
    isAffiliated,
    isCheckingAffiliation,
    isAddingAffiliation,
    addAffiliation,
  };

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

export const PageContext = createContext<PageContextType | null>(null);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used inside PageContextProvider");
  }
  return context;
}
