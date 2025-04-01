import {
  Cog6ToothIcon,
  ComputerDesktopIcon,
  HomeIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Logo } from "./icons/logo";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
  }

  const navigation = [
    { name: "Дашбоард", path: "/", icon: HomeIcon },
    { name: "Ширээ", path: "/table", icon: ComputerDesktopIcon },
    { name: "User", path: "/user", icon: UserCircleIcon },
  ];

  return (
    <div>
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between bg-gradient-to-br from-blue-950 to-[#0e1245] px-4 sm:hidden">
        <div className="flex items-center">
          <Logo />
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-300 hover:text-white focus:outline-none"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-50 bg-gradient-to-br from-blue-950 to-[#0e1245] px-6 pb-4 sm:hidden">
          <nav className="flex flex-col">
            <ul role="list" className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.path}
                    className={classNames(
                      pathname === item.path
                        ? "bg-blue-700 border-blue-600 text-white"
                        : "text-gray-400 hover:bg-blue-600 hover:text-white",
                      "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors duration-300 ease-in-out cursor-pointer border border-transparent"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)} 
                  >
                    <item.icon
                      aria-hidden="true"
                      className="h-6 w-6 shrink-0 text-gray-300 group-hover:text-white"
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
              <li className="mt-4">
                <div
                  onClick={() => {
                    router.push("#");
                    setIsMobileMenuOpen(false); 
                  }}
                  className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors duration-300 ease-in-out"
                >
                  <Cog6ToothIcon
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0 text-gray-300 group-hover:text-white"
                  />
                  Settings
                </div>
              </li>
            </ul>
          </nav>
        </div>
      )}

      <div className="hidden sm:fixed sm:inset-y-0 sm:z-50 sm:flex sm:w-72 sm:shadow-lg">
        <div className="flex grow flex-col gap-y-4 overflow-y-auto px-6 pb-4 bg-gradient-to-br from-blue-950 to-[#0e1245]">
          <div className="flex h-16 shrink-0 items-center">
            <Logo />
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.path}
                        className={classNames(
                          pathname === item.path
                            ? "bg-blue-700 border-blue-600 text-white"
                            : "text-gray-400 hover:bg-blue-600 hover:text-white",
                          "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors duration-300 ease-in-out cursor-pointer border border-transparent"
                        )}
                      >
                        <item.icon
                          aria-hidden="true"
                          className="h-6 w-6 shrink-0 text-gray-300 group-hover:text-white"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <div
                  onClick={() => router.push("#")}
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors duration-300 ease-in-out"
                >
                  <Cog6ToothIcon
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0 text-gray-300 group-hover:text-white"
                  />
                  Settings
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}