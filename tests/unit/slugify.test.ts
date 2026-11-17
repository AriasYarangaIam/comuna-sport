/// <reference types="jest" />

import { slugify } from "../../src/domain/services/slugify";

// S1 (odd/tasks/privacy-identifiers-and-copy.md): the slug is the public
// identifier of a space. The SQL mirror lives in
// db/migrations/004_spaces_slug.sql (spaces_slug_from_name) — the examples
// below pin the shared derivation both sides must reproduce.
describe("slugify", (): void => {
    it("produces the documented slug for a seeded space name", (): void => {
        expect(slugify("Cancha de Veteranos Miraflores")).toBe("cancha-de-veteranos-miraflores");
    });

    it("strips Spanish accents instead of dropping the letters", (): void => {
        expect(slugify("Cancha Peñón Ñulo Águila")).toBe("cancha-penon-nulo-aguila");
    });

    it("lowercases and collapses every run of non-alphanumerics into one hyphen", (): void => {
        expect(slugify("  LOSA  --- BARRANCO!! ")).toBe("losa-barranco");
    });

    it("trims leading and trailing hyphens", (): void => {
        expect(slugify("¡Multiusos San Isidro!")).toBe("multiusos-san-isidro");
    });

    it("returns an empty string for a name with no alphanumerics", (): void => {
        expect(slugify("!!!")).toBe("");
    });
});
