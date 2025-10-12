# remark-img-group

A remark plugin that automatically adjusts layout properties for `Img` components nested within `ImgGroup` components in MDX files.

## Purpose

When using MDX components, individual `Img` components may have layout properties that should be overridden when they appear inside an `ImgGroup`. This plugin traverses the MDX AST and sets the layout attribute to `none` for all `Img` components found within `ImgGroup` components, ensuring consistent layout behavior within image groups.

## Usage

The plugin is used internally by Spectral Codex to process MDX content during the build process.
