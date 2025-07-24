from typing import Optional

from fmfactlabel import FMProperties, FMPropertyMeasure

from flamapy.metamodels.fm_metamodel.models import FeatureModel
from flamapy.metamodels.fm_metamodel.operations import FMLanguageLevel


class FMMetadata():

    def __init__(self, 
                 model: FeatureModel, 
                 name: Optional[str] = None,
                 description: Optional[str] = None,
                 author: Optional[str] = None,
                 year: Optional[int] = None,
                 reference: Optional[str] = None,
                 tags: Optional[str] = None,
                 domains: Optional[list[str]] = None) -> None:
        self.fm = model
        self.name = name 
        self.description = description 
        self.author = author 
        self.year = year 
        self.reference = reference 
        self.tags = tags 
        self.domains = domains 

    def get_metadata(self) -> list[FMPropertyMeasure]:
        result = []
        result.append(self.fm_name(self.name))
        result.append(self.fm_description(self.description))
        result.append(self.fm_author(self.author))
        result.append(self.fm_year(self.year))
        result.append(self.fm_reference(self.reference))
        result.append(self.fm_tags(self.tags))
        result.append(self.fm_domains(self.domains))
        result.append(self.fm_language_level())
        return result

    def fm_name(self, value: Optional[str] = None) -> FMPropertyMeasure:
        value = value if value is not None else self.fm.root.name 
        return FMPropertyMeasure(FMProperties.NAME.value, value)
    
    def fm_description(self, value: Optional[str] = None) -> FMPropertyMeasure:
        if value is None:
            return FMPropertyMeasure(FMProperties.DESCRIPTION.value)    
        return FMPropertyMeasure(FMProperties.DESCRIPTION.value, value)

    def fm_author(self, value: Optional[str] = None) -> FMPropertyMeasure:
        if value is None:
            return FMPropertyMeasure(FMProperties.AUTHOR.value)    
        return FMPropertyMeasure(FMProperties.AUTHOR.value, value)
        
    def fm_year(self, value: Optional[str] = None) -> FMPropertyMeasure:
        if value is None:
            return FMPropertyMeasure(FMProperties.YEAR.value)    
        return FMPropertyMeasure(FMProperties.YEAR.value, value)
    
    def fm_reference(self, value: Optional[str] = None) -> FMPropertyMeasure:
        if value is None:
            return FMPropertyMeasure(FMProperties.REFERENCE.value)    
        return FMPropertyMeasure(FMProperties.REFERENCE.value, value)

    def fm_tags(self, value: Optional[str] = None) -> FMPropertyMeasure:
        if value is None:
            return FMPropertyMeasure(FMProperties.TAGS.value)    
        return FMPropertyMeasure(FMProperties.TAGS.value, value)
    
    def fm_domains(self, value: Optional[str] = None) -> FMPropertyMeasure:
        if value is None:
            return FMPropertyMeasure(FMProperties.DOMAIN.value)    
        return FMPropertyMeasure(FMProperties.DOMAIN.value, value)
    
    def fm_language_level(self) -> FMPropertyMeasure:
        value = FMLanguageLevel().execute(self.fm).get_result()
        minor_levels = ', '.join(level.name.capitalize().replace('_', ' ') for level in value.minors)
        minor_levels = f' ({minor_levels})' if minor_levels else ''
        value = f'{value.major.name.capitalize()}{minor_levels}'
        return FMPropertyMeasure(FMProperties.LANGUAGE_LEVEL.value, value)
