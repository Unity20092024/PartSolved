"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, Heart, Menu, Search, UserRound } from "lucide-react";
import { Brand } from "./brand";
import { MobileNavigation, navigation } from "./mobile-navigation";
import { Dialog } from "@/components/ui/dialog";

type Panel = "search" | "favorites" | "account" | "menu" | null;
export function SiteHeader() {
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className="desktop-navigation" aria-label="Main navigation">
          <Link
            className="button button-primary nav-find"
            href="/#photo-upload"
          >
            Find a Part
          </Link>
          {navigation.map(({ href, label }) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Search catalog"
            onClick={() => {
              setPanel("search");
              setSubmitted(false);
            }}
          >
            <Search aria-hidden="true" />
          </button>
          <button
            className="icon-button secondary-action"
            aria-label="Open favorites"
            onClick={() => setPanel("favorites")}
          >
            <Heart aria-hidden="true" />
          </button>
          <button
            className="icon-button secondary-action"
            aria-label="Open account"
            onClick={() => setPanel("account")}
          >
            <UserRound aria-hidden="true" />
          </button>
        </div>
        <Link
          className="mobile-camera icon-button"
          href="/#photo-upload"
          aria-label="Find a part with a photo"
        >
          <Camera aria-hidden="true" />
        </Link>
        <button
          className="mobile-menu icon-button"
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
          onClick={() => setPanel("menu")}
        >
          <Menu aria-hidden="true" />
        </button>
      </div>
      {panel && (
        <Dialog
          title={
            {
              search: "Search for a part",
              favorites: "Your favorites",
              account: "Your account",
              menu: "Explore PartSolved",
            }[panel]
          }
          onClose={() => setPanel(null)}
        >
          {panel === "search" && (
            <form
              className="search-form"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(true);
              }}
            >
              <label htmlFor="catalog-query">
                Part name, number, or description
              </label>
              <div className="search-row">
                <input
                  id="catalog-query"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSubmitted(false);
                  }}
                  placeholder="e.g. window latch"
                  required
                  maxLength={200}
                />
                <button type="submit" className="button button-primary">
                  Search
                </button>
              </div>
              <p role="status">
                {submitted
                  ? `Catalog search is not connected yet. We can’t return results for “${query}” at this stage.`
                  : "Catalog search is coming soon. You can enter a query, but live product results are not available yet."}
              </p>
            </form>
          )}
          {panel === "favorites" && (
            <div className="panel-state">
              <Heart size={40} aria-hidden="true" />
              <h3>No saved parts yet</h3>
              <p>
                Saving favorites will be available when the catalog launches.
              </p>
              <Link
                href="/#categories"
                className="button button-secondary"
                onClick={() => setPanel(null)}
              >
                Browse categories
              </Link>
            </div>
          )}
          {panel === "account" && (
            <div className="panel-state">
              <UserRound size={40} aria-hidden="true" />
              <h3>Account features are coming soon</h3>
              <p>
                Sign-in and saved account details are not available in this
                first release.
              </p>
            </div>
          )}
          {panel === "menu" && (
            <>
              <MobileNavigation onNavigate={() => setPanel(null)} />
              <div className="mobile-extras">
                <button
                  className="button button-secondary"
                  onClick={() => setPanel("favorites")}
                >
                  <Heart size={18} aria-hidden="true" />
                  Favorites
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => setPanel("account")}
                >
                  <UserRound size={18} aria-hidden="true" />
                  Account
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </header>
  );
}
