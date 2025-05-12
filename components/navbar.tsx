"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useWeb3 } from "@/providers/web3-provider";
import { 
  CircleDollarSign, 
  Landmark, 
  FileText, 
  Upload, 
  CheckCircle,
  Menu,
  X,
  TrendingUp,
  User
} from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetClose 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, isSignedLicense, kycStatus } = useWeb3();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { 
      name: "Home", 
      href: "/", 
      icon: <Landmark className="h-5 w-5" />,
      active: pathname === "/",
      always: true
    },
    { 
      name: "License", 
      href: "/license", 
      icon: <FileText className="h-5 w-5" />,
      active: pathname === "/license",
      show: isConnected
    },
    { 
      name: "KYC", 
      href: "/kyc", 
      icon: <Upload className="h-5 w-5" />,
      active: pathname === "/kyc",
      show: isConnected && isSignedLicense
    },
    { 
      name: "Verification", 
      href: "/verification", 
      icon: <CheckCircle className="h-5 w-5" />,
      active: pathname === "/verification",
      show: isConnected && isSignedLicense
    },
    { 
      name: "Marketplace", 
      href: "/marketplace", 
      icon: <CircleDollarSign className="h-5 w-5" />,
      active: pathname === "/marketplace",
      show: isConnected && kycStatus === 'approved'
    },
    // { 
    //   name: "Investments", 
    //   href: "/investments", 
    //   icon: <Landmark className="h-5 w-5" />,
    //   active: pathname === "/investments",
    //   show: isConnected && kycStatus === 'approved'
    // },
    { 
      name: "Synthetic RUB", 
      href: "/lending", 
      icon: <TrendingUp className="h-5 w-5" />,
      active: pathname === "/lending",
      show: isConnected && kycStatus === 'approved'
    }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and desktop navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <CircleDollarSign className="h-8 w-8 text-emerald-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">OFZ Crypto Portal</span>
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navigation.map((item) => {
                if (!item.show && !item.always) return null;
                
                return (
                  <Link 
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      item.active 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
                    } transition-colors duration-200`}
                  >
                    {item.icon}
                    <span className="ml-1">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Right side buttons */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-2">
            <ConnectWalletButton 
              variant="default" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            />
            {isConnected && (
              <Link href="/profile">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={pathname === "/profile" ? "bg-emerald-100 text-emerald-700" : ""}
                >
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <CircleDollarSign className="h-8 w-8 text-emerald-600" />
                    <span className="ml-2 text-xl font-bold text-gray-900">OFZ Crypto</span>
                  </div>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="text-gray-600">
                      <X className="h-6 w-6" />
                    </Button>
                  </SheetClose>
                </div>
                
                <div className="flex flex-col space-y-1">
                  {navigation.map((item) => {
                    if (!item.show && !item.always) return null;
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          item.active 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
                        } transition-colors duration-200`}
                      >
                        {item.icon}
                        <span className="ml-2">{item.name}</span>
                      </Link>
                    );
                  })}
                  {isConnected && (
                    <Link
                      href="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        pathname === "/profile"
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
                      } transition-colors duration-200`}
                    >
                      <User className="h-5 w-5" />
                      <span className="ml-2">Profile</span>
                    </Link>
                  )}
                </div>
                
                <div className="mt-6">
                  <ConnectWalletButton 
                    variant="default" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}